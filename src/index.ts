#!/usr/bin/env node

import * as p from '@clack/prompts'
import { defineCommand, runMain } from 'citty'
import { downloadTemplate } from 'giget'
import pc from 'picocolors'
import { existsSync, cpSync, readFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execSync } from 'node:child_process'
import { stacks, getStack } from './stacks.js'

interface ScaffoldConfig {
  name?: string
  description?: string
  ignore?: string[]
}

const DEFAULT_IGNORE = ['.git', 'node_modules', '.DS_Store']

function isLocalPath(source: string): boolean {
  return source.startsWith('.') || source.startsWith('/') || source.startsWith('~')
}

function expandPath(source: string): string {
  if (source.startsWith('~')) {
    return source.replace('~', process.env.HOME || '')
  }
  return resolve(process.cwd(), source)
}

function loadScaffoldConfig(templatePath: string): ScaffoldConfig {
  const configPath = join(templatePath, '.scaffold', 'config.json')
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'))
    } catch {
      return {}
    }
  }
  return {}
}

function shouldIgnore(filePath: string, patterns: string[]): boolean {
  const fileName = filePath.split('/').pop() || ''
  return patterns.some(pattern => {
    // Simple glob matching
    if (pattern.startsWith('*.')) {
      return fileName.endsWith(pattern.slice(1))
    }
    return filePath.includes(pattern)
  })
}

function runHook(templatePath: string, hookName: string, targetDir: string): void {
  const hookPath = join(templatePath, '.scaffold', `${hookName}.sh`)
  if (existsSync(hookPath)) {
    try {
      execSync(`bash "${hookPath}"`, {
        cwd: targetDir,
        stdio: 'inherit',
        env: { ...process.env, SCAFFOLD_TARGET: targetDir }
      })
    } catch {
      // Hook failed, but continue
    }
  }
}

const main = defineCommand({
  meta: {
    name: 'scaffold',
    version: '0.0.1',
    description: 'Scaffold projects from curated stacks',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Project name',
      required: false,
    },
    stack: {
      type: 'string',
      alias: 's',
      description: 'Curated stack (e.g., ash-stack)',
    },
    from: {
      type: 'string',
      alias: 'f',
      description: 'GitHub repo (user/repo) or local path (./my-template)',
    },
    list: {
      type: 'boolean',
      alias: 'l',
      description: 'List available stacks',
    },
    yes: {
      type: 'boolean',
      alias: 'y',
      description: 'Skip confirmations (run post-install automatically)',
    },
  },
  async run({ args }) {
    // List stacks
    if (args.list) {
      console.log('\n' + pc.bold('Available stacks:') + '\n')
      for (const stack of stacks) {
        console.log(`  ${pc.cyan(stack.name)} - ${stack.description}`)
      }
      console.log('\n' + pc.dim('Or use --from <user/repo> or --from <./local/path>') + '\n')
      return
    }

    p.intro(pc.bgCyan(pc.black(' scaffold ')))

    let projectName = args.name
    let source: string | undefined

    // Determine source: --from takes priority, then --stack
    if (args.from) {
      source = args.from
    } else if (args.stack) {
      const stack = getStack(args.stack)
      if (!stack) {
        p.cancel(`Stack "${args.stack}" not found. Use --list to see available stacks.`)
        process.exit(1)
      }
      source = stack.repo
    }

    // Get project name
    if (!projectName) {
      const nameResult = await p.text({
        message: 'Project name?',
        placeholder: 'my-app',
        validate: (value) => {
          if (!value) return 'Project name is required'
          if (existsSync(resolve(process.cwd(), value))) {
            return `Directory "${value}" already exists`
          }
        },
      })

      if (p.isCancel(nameResult)) {
        p.cancel('Cancelled')
        process.exit(0)
      }
      projectName = nameResult
    }

    // Validate project directory doesn't exist
    const targetDir = resolve(process.cwd(), projectName)
    if (existsSync(targetDir)) {
      p.cancel(`Directory "${projectName}" already exists`)
      process.exit(1)
    }

    // Get source if not provided
    if (!source) {
      const sourceType = await p.select({
        message: 'Choose a source',
        options: [
          { value: 'curated', label: 'Curated stacks', hint: 'Pre-configured templates' },
          { value: 'custom', label: 'Custom', hint: 'GitHub repo or local path' },
        ],
      })

      if (p.isCancel(sourceType)) {
        p.cancel('Cancelled')
        process.exit(0)
      }

      if (sourceType === 'curated') {
        const stackResult = await p.select({
          message: 'Which stack?',
          options: stacks.map((s) => ({
            value: s.repo,
            label: s.name,
            hint: s.description,
          })),
        })

        if (p.isCancel(stackResult)) {
          p.cancel('Cancelled')
          process.exit(0)
        }
        source = stackResult as string
      } else {
        const customSource = await p.text({
          message: 'Enter GitHub repo (user/repo) or local path',
          placeholder: 'username/repo or ./local/path',
          validate: (value) => {
            if (!value) return 'Source is required'
          },
        })

        if (p.isCancel(customSource)) {
          p.cancel('Cancelled')
          process.exit(0)
        }
        source = customSource
      }
    }

    // Scaffold
    const s = p.spinner()
    const isLocal = isLocalPath(source)
    const displaySource = isLocal ? pc.dim('(local) ') + source : source
    s.start(`Scaffolding ${pc.cyan(displaySource)}`)

    try {
      let templatePath: string

      if (isLocal) {
        templatePath = expandPath(source)
        if (!existsSync(templatePath)) {
          throw new Error(`Local path not found: ${templatePath}`)
        }
      } else {
        // Download to temp location first to read config
        const tempDir = join(process.env.TMPDIR || '/tmp', `scaffold-${Date.now()}`)
        await downloadTemplate(`github:${source}`, {
          dir: tempDir,
          forceClean: true,
        })
        templatePath = tempDir
      }

      // Load scaffold config
      const config = loadScaffoldConfig(templatePath)
      const ignorePatterns = [...DEFAULT_IGNORE, ...(config.ignore || [])]

      // Run pre-install hook
      runHook(templatePath, 'pre-install', templatePath)

      // Copy files
      cpSync(templatePath, targetDir, {
        recursive: true,
        filter: (src) => {
          const relativePath = src.replace(templatePath, '')
          // Always skip .scaffold folder
          if (relativePath.includes('.scaffold')) return false
          return !shouldIgnore(relativePath, ignorePatterns)
        }
      })

      // Clean up temp dir if downloaded
      if (!isLocal) {
        rmSync(templatePath, { recursive: true, force: true })
      }

      s.stop(`Scaffolded into ${pc.cyan(projectName)}`)

      // Run post-install hook
      const postHookPath = join(templatePath, '.scaffold', 'post-install.sh')
      if (existsSync(postHookPath)) {
        let runHooks = args.yes

        if (!runHooks) {
          const confirm = await p.confirm({
            message: 'Run post-install script?',
            initialValue: true,
          })
          runHooks = !p.isCancel(confirm) && confirm
        }

        if (runHooks) {
          const h = p.spinner()
          h.start('Running post-install...')
          try {
            // Copy hook to target and run from there
            const targetHook = join(targetDir, '.scaffold-post-install.sh')
            cpSync(postHookPath, targetHook)
            execSync(`bash "${targetHook}"`, {
              cwd: targetDir,
              stdio: 'inherit',
              env: { ...process.env, SCAFFOLD_TARGET: targetDir }
            })
            rmSync(targetHook, { force: true })
            h.stop('Post-install complete')
          } catch {
            h.stop('Post-install failed (continuing anyway)')
          }
        }
      }

      // Next steps
      p.note(
        `cd ${projectName}\n\n# Then follow the template's README`,
        'Next steps'
      )

      p.outro(pc.green('Done!'))
    } catch (error) {
      s.stop('Failed to scaffold')
      p.cancel(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
      process.exit(1)
    }
  },
})

runMain(main)
