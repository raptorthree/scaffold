import * as p from '@clack/prompts'
import type { Prompt } from './schema.js'

function normalizeOptions(options: (string | { value: string; label: string; hint?: string })[]) {
  return options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
}

function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''")
}

export async function runPrompts(
  prompts: Prompt[],
  nonInteractive: boolean
): Promise<Record<string, string>> {
  const env: Record<string, string> = {}
  const seen = new Set<string>()

  for (const prompt of prompts) {
    // Check duplicates
    if (seen.has(prompt.name)) {
      throw new Error(`Duplicate prompt name: "${prompt.name}"`)
    }
    seen.add(prompt.name)

    // Non-interactive: use defaults
    if (nonInteractive) {
      if (prompt.initialValue === undefined) {
        throw new Error(`Prompt "${prompt.name}" needs initialValue for non-interactive mode (-y)`)
      }
      const val = Array.isArray(prompt.initialValue)
        ? prompt.initialValue.join(',')
        : String(prompt.initialValue)
      env[`SCAFFOLD_${prompt.name.toUpperCase()}`] = escapeShell(val)
      continue
    }

    // Interactive: run prompt
    let result: unknown

    switch (prompt.type) {
      case 'text':
        result = await p.text({
          message: prompt.message,
          placeholder: prompt.placeholder,
          defaultValue: prompt.initialValue,
        })
        break

      case 'select':
        result = await p.select({
          message: prompt.message,
          options: normalizeOptions(prompt.options),
          initialValue: prompt.initialValue,
        })
        break

      case 'confirm':
        result = await p.confirm({
          message: prompt.message,
          initialValue: prompt.initialValue,
        })
        break

      case 'multiselect':
        result = await p.multiselect({
          message: prompt.message,
          options: normalizeOptions(prompt.options),
          initialValues: prompt.initialValue,
        })
        break
    }

    if (p.isCancel(result)) {
      p.cancel('Cancelled')
      process.exit(0)
    }

    const value = Array.isArray(result) ? result.join(',') : String(result)
    env[`SCAFFOLD_${prompt.name.toUpperCase()}`] = escapeShell(value)
  }

  return env
}
