import * as p from '@clack/prompts'
import type { Option } from '@clack/prompts'
import type { Prompt } from './schema.js'
import { cancel } from './index.js'

type PromptOption = string | Option<string>

function normalizeOptions(options: PromptOption[]): Option<string>[] {
  return options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
}

function assertNever(x: never): never {
  throw new Error(`Unexpected prompt type: ${(x as { type: string }).type}`)
}

export async function runPrompts(
  prompts: Prompt[],
  nonInteractive: boolean
): Promise<Record<string, string>> {
  const env: Record<string, string> = {}

  for (const prompt of prompts) {
    const envKey = `SCAFFOLD_${prompt.name.toUpperCase()}`

    // Password prompts cannot run in non-interactive mode
    if (prompt.type === 'password' && nonInteractive) {
      throw new Error(`Password prompt "${prompt.name}" cannot run in non-interactive mode (-y)`)
    }

    // Non-interactive: use defaults
    if (nonInteractive) {
      if (prompt.initialValue === undefined) {
        throw new Error(`Prompt "${prompt.name}" needs initialValue for non-interactive mode (-y)`)
      }
      env[envKey] = Array.isArray(prompt.initialValue)
        ? prompt.initialValue.join(',')
        : String(prompt.initialValue)
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

      case 'password':
        result = await p.password({
          message: prompt.message,
          mask: prompt.mask,
        })
        break

      case 'select':
        result = await p.select({
          message: prompt.message,
          options: normalizeOptions(prompt.options),
          initialValue: prompt.initialValue,
          maxItems: prompt.maxItems,
        })
        break

      case 'confirm':
        result = await p.confirm({
          message: prompt.message,
          active: prompt.active,
          inactive: prompt.inactive,
          initialValue: prompt.initialValue,
        })
        break

      case 'multiselect':
        result = await p.multiselect({
          message: prompt.message,
          options: normalizeOptions(prompt.options),
          initialValues: prompt.initialValue,
          maxItems: prompt.maxItems,
          required: prompt.required,
        })
        break

      default:
        assertNever(prompt)
    }

    if (p.isCancel(result)) {
      cancel()
    }

    env[envKey] = Array.isArray(result) ? result.join(',') : String(result)
  }

  return env
}
