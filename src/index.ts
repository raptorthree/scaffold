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

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

interface ScaffoldConfig {
  name?: string
  description?: string
  ignore?: string[]
}

const DEFAULT_IGNORE = ['.git', 'node_modules', '.DS_Store', '.scaffold']

function cancel(msg = 'Cancelled'): never {
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

function loadConfig(templatePath: string): ScaffoldConfig {
  const configPath = join(templatePath, '.scaffold', 'config.json')
  if (!existsSync(configPath)) return {}
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  } catch {
    return {}
  }
}

function shouldIgnore(path: string, patterns: string[]): boolean {
  const name = basename(path)
  return patterns.some(pattern => {
    if (pattern.startsWith('*.')) return name.endsWith(pattern.slice(1))
    return path.includes(pattern)
  })
}

async function runPostInstall(hookPath: string, targetDir: string, auto: boolean): Promise<void> {
  if (!existsSync(hookPath)) return

  const run = auto || onCancel(await p.confirm({
    message: 'Run post-install script?',
    initialValue: true,
  }))

  if (!run) return

  const s = p.spinner()
  s.start('Running post-install...')
  try {
    execSync(`sh "${hookPath}"`, {
      cwd: targetDir,
      stdio: 'inherit',
      env: { ...process.env, SCAFFOLD_TARGET: targetDir }
    })
    s.stop('Post-install complete')
  } catch {
    s.stop('Post-install failed')
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
      description: 'Skip confirmations',
    },
  },
  async run({ args }) {
    p.intro(pc.bgCyan(pc.black(' scaffold ')))

    let source = args.from

    // Get project name
    let projectName = args.name
    if (!projectName) {
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

    try {
      let templatePath: string
      let postInstallPath: string | undefined

      if (isLocal) {
        templatePath = expandPath(source)
        if (!existsSync(templatePath)) throw new Error(`Not found: ${templatePath}`)
        postInstallPath = join(templatePath, '.scaffold', 'post-install.sh')
      } else {
        const tempDir = join(tmpdir(), `scaffold-${Date.now()}`)
        await downloadTemplate(toGigetSource(source), { dir: tempDir, forceClean: true })
        templatePath = tempDir

        const srcHook = join(tempDir, '.scaffold', 'post-install.sh')
        if (existsSync(srcHook)) {
          postInstallPath = join(tmpdir(), `scaffold-hook-${Date.now()}.sh`)
          cpSync(srcHook, postInstallPath)
        }
      }

      const config = loadConfig(templatePath)
      const ignore = [...DEFAULT_IGNORE, ...(config.ignore || [])]

      cpSync(templatePath, targetDir, {
        recursive: true,
        filter: src => !shouldIgnore(src.replace(templatePath, ''), ignore)
      })

      if (!isLocal) rmSync(templatePath, { recursive: true, force: true })

      s.stop(`Scaffolded ${pc.cyan(projectName)}`)

      if (postInstallPath) {
        await runPostInstall(postInstallPath, targetDir, args.yes ?? false)
        if (!isLocal) rmSync(postInstallPath, { force: true })
      }

      p.note(`cd ${projectName}`, 'Next')
      p.outro(pc.green('Done!'))
    } catch (err) {
      s.stop('Failed')
      fail(err instanceof Error ? err.message : 'Unknown error')
    }
  },
})

runMain(main)
