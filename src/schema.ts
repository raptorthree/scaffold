import { z } from 'zod'

const PromptOption = z.union([
  z.string(),
  z.object({ value: z.string(), label: z.string(), hint: z.string().optional() })
])

const getOptionValues = (options: z.infer<typeof PromptOption>[]) =>
  options.map(o => typeof o === 'string' ? o : o.value)

const BasePrompt = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'must be valid env var name (letters, numbers, underscore)'),
  message: z.string(),
})

const TextPrompt = BasePrompt.extend({
  type: z.literal('text'),
  placeholder: z.string().optional(),
  initialValue: z.string().optional(),
})

const PasswordPrompt = BasePrompt.extend({
  type: z.literal('password'),
  mask: z.string().optional(),
})

const SelectPrompt = BasePrompt.extend({
  type: z.literal('select'),
  options: z.array(PromptOption).min(1, 'needs at least one option'),
  initialValue: z.string().optional(),
  maxItems: z.number().positive().optional(),
}).refine(
  data => {
    if (data.initialValue === undefined) return true
    return getOptionValues(data.options).includes(data.initialValue)
  },
  { message: 'initialValue must match one of the options', path: ['initialValue'] }
)

const ConfirmPrompt = BasePrompt.extend({
  type: z.literal('confirm'),
  active: z.string().optional(),
  inactive: z.string().optional(),
  initialValue: z.boolean().optional(),
})

const MultiSelectPrompt = BasePrompt.extend({
  type: z.literal('multiselect'),
  options: z.array(PromptOption).min(1, 'needs at least one option'),
  initialValue: z.array(z.string()).optional(),
  maxItems: z.number().positive().optional(),
  required: z.boolean().optional(),
}).refine(
  data => {
    if (!data.initialValue?.length) return true
    const values = getOptionValues(data.options)
    return data.initialValue.every(v => values.includes(v))
  },
  { message: 'initialValue items must match options', path: ['initialValue'] }
)

const Prompt = z.union([TextPrompt, PasswordPrompt, SelectPrompt, ConfirmPrompt, MultiSelectPrompt])

const uniqueNames = (prompts: z.infer<typeof Prompt>[]) => {
  const names = prompts.map(p => p.name)
  return new Set(names).size === names.length
}

export const ScaffoldConfig = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  ignore: z.array(z.string()).optional(),
  prompts: z.array(Prompt).refine(uniqueNames, { message: 'prompt names must be unique' }).optional(),
})

export type ScaffoldConfig = z.infer<typeof ScaffoldConfig>
export type Prompt = z.infer<typeof Prompt>
