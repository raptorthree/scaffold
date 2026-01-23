#!/usr/bin/env node

import * as p from '@clack/prompts'
import { defineCommand, runMain } from 'citty'
import { downloadTemplate } from 'giget'
import pc from 'picocolors'
import { existsSync, cpSync, readFileSync, rmSync } from 'node:fs'
import { resolve, join, basename, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { ScaffoldConfig } from './schema.js'
import { runPrompts } from './prompts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

const DEFAULT_IGNORE = ['.git', 'node_modules', '.DS_Store', '.scaffold']

export function cancel(msg = 'Cancelled'): never {
  p.cancel(msg)
  process.exit(0)
}

function fail(msg: string): never {
  p.cancel(msg)
  process.exit(1)
}

function onCancel<T>(result: T | symbol): T {
  if (p.isCancel(result)) cancel()
  return result as T
}

function isLocalPath(source: string): boolean {
  return source.startsWith('.') || source.startsWith('/') || source.startsWith('~')
}

function toGigetSource(source: string): string {
  if (source.includes(':')) return source
  return `github:${source}`
}

function expandPath(source: string): string {
  if (source.startsWith('~')) {
    return source.replace('~', process.env.HOME || '')
  }
  return resolve(process.cwd(), source)
}

interface ZodLikeError extends Error {
  issues: Array<{ path: (string | number)[]; message: string }>
}

function isZodError(err: unknown): err is ZodLikeError {
  return err instanceof Error && 'issues' in err && Array.isArray((err as ZodLikeError).issues)
}

function formatZodIssue(issue: { path: (string | number)[]; message: string }): string {
  const prefix = issue.path.length ? `${issue.path.join('.')}: ` : ''
  return prefix + issue.message
}

function loadConfig(templatePath: string): ScaffoldConfig {
  const configPath = join(templatePath, '.scaffold', 'config.json')
  if (!existsSync(configPath)) return {}

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'))
    return ScaffoldConfig.parse(raw)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in .scaffold/config.json`)
    }
    if (isZodError(err)) {
      const msg = err.issues.map(formatZodIssue).join(', ')
      throw new Error(`Invalid config: ${msg}`)
    }
    throw err
  }
}

function shouldIgnore(relativePath: string, patterns: string[]): boolean {
  const segments = relativePath.split('/').filter(Boolean)
  const name = basename(relativePath)

  return patterns.some(pattern => {
    // Extension pattern: *.log
    if (pattern.startsWith('*.')) {
      return name.endsWith(pattern.slice(1))
    }
    // Exact segment match: node_modules, .git, tmp
    return segments.includes(pattern)
  })
}

function copyHookToTemp(src: string, label: string): string | undefined {
  if (!existsSync(src)) return undefined
  const dest = join(tmpdir(), `scaffold-${label}-${Date.now()}.sh`)
  cpSync(src, dest)
  return dest
}

function runScript(hookPath: string, cwd: string, env: Record<string, string>, label: string): void {
  try {
    execSync(`sh "${hookPath}"`, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, ...env }
    })
    p.log.success(`${label} complete`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    throw new Error(`${label} failed: ${msg}`)
  }
}

const main = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  args: {
    name: {
      type: 'positional',
      description: 'Project name',
      required: false,
    },
    from: {
      type: 'string',
      alias: 'f',
      description: 'Repo (user/repo, gitlab:user/repo) or local path',
    },
    yes: {
      type: 'boolean',
      alias: 'y',
      description: 'Non-interactive mode (use defaults)',
    },
  },
  async run({ args }) {
    p.intro(pc.bgCyan(pc.black(' scaffold ')))

    const nonInteractive = args.yes ?? false
    let source = args.from

    // Get project name
    let projectName = args.name
    if (!projectName) {
      if (nonInteractive) fail('Project name required in non-interactive mode')
      projectName = onCancel(await p.text({
        message: 'Project name?',
        placeholder: 'my-app',
        validate: v => {
          if (!v) return 'Required'
          if (existsSync(resolve(process.cwd(), v))) return 'Already exists'
        },
      }))
    }

    const targetDir = resolve(process.cwd(), projectName)
    if (existsSync(targetDir)) fail(`"${projectName}" already exists`)

    // Get source if not provided
    if (!source) {
      if (nonInteractive) fail('Source required in non-interactive mode (--from)')
      source = onCancel(await p.text({
        message: 'Repo or local path',
        placeholder: 'user/repo, gitlab:user/repo, ./path',
        validate: v => v ? undefined : 'Required',
      }))
    }

    // Scaffold
    const s = p.spinner()
    const isLocal = isLocalPath(source)
    s.start(`Scaffolding ${isLocal ? pc.dim('(local) ') : ''}${pc.cyan(source)}`)

    let preInstallPath: string | undefined
    let postInstallPath: string | undefined

    try {
      let templatePath: string

      if (isLocal) {
        templatePath = expandPath(source)
        if (!existsSync(templatePath)) throw new Error(`Not found: ${templatePath}`)
        preInstallPath = join(templatePath, '.scaffold', 'pre-install.sh')
        postInstallPath = join(templatePath, '.scaffold', 'post-install.sh')
      } else {
        const tempDir = join(tmpdir(), `scaffold-${Date.now()}`)
        await downloadTemplate(toGigetSource(source), { dir: tempDir, forceClean: true })
        templatePath = tempDir

        // Copy hooks before .scaffold is removed
        preInstallPath = copyHookToTemp(join(tempDir, '.scaffold', 'pre-install.sh'), 'pre')
        postInstallPath = copyHookToTemp(join(tempDir, '.scaffold', 'post-install.sh'), 'post')
      }

      const config = loadConfig(templatePath)
      const ignore = [...DEFAULT_IGNORE, ...(config.ignore || [])]

      const baseEnv = {
        SCAFFOLD_TARGET: targetDir,
        SCAFFOLD_NON_INTERACTIVE: nonInteractive ? '1' : '',
      }

      // Run pre-install (before copying)
      if (preInstallPath && existsSync(preInstallPath)) {
        s.stop('Pre-install')
        runScript(preInstallPath, templatePath, baseEnv, 'pre-install')
        if (!isLocal) {
          rmSync(preInstallPath, { force: true })
          preInstallPath = undefined
        }
        s.start('Copying files...')
      }

      cpSync(templatePath, targetDir, {
        recursive: true,
        filter: src => !shouldIgnore(src.replace(templatePath, ''), ignore)
      })

      if (!isLocal) rmSync(templatePath, { recursive: true, force: true })

      s.stop(`Scaffolded ${pc.cyan(projectName)}`)

      // Run prompts if defined
      let promptEnv: Record<string, string> = {}
      if (config.prompts?.length) {
        promptEnv = await runPrompts(config.prompts, nonInteractive)
      }

      // Run post-install (after copying, with prompt answers)
      if (postInstallPath && existsSync(postInstallPath)) {
        runScript(postInstallPath, targetDir, { ...baseEnv, ...promptEnv }, 'post-install')
        if (!isLocal) {
          rmSync(postInstallPath, { force: true })
          postInstallPath = undefined
        }
      }

      p.note(`cd ${projectName}`, 'Next')
      p.outro(pc.green('Done!'))
    } catch (err) {
      s.stop('Failed')
      // Cleanup temp hooks on error
      if (preInstallPath && !isLocal) rmSync(preInstallPath, { force: true })
      if (postInstallPath && !isLocal) rmSync(postInstallPath, { force: true })
      fail(err instanceof Error ? err.message : 'Unknown error')
    }
  },
})

runMain(main)
