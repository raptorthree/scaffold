import { z } from 'zod'

const Option = z.union([
  z.string(),
  z.object({ value: z.string(), label: z.string(), hint: z.string().optional() })
])

const BasePrompt = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'must be valid env var name (letters, numbers, underscore)'),
  message: z.string(),
})

const TextPrompt = BasePrompt.extend({
  type: z.literal('text'),
  placeholder: z.string().optional(),
  initialValue: z.string().optional(),
})

const SelectPrompt = BasePrompt.extend({
  type: z.literal('select'),
  options: z.array(Option).min(1, 'needs at least one option'),
  initialValue: z.string().optional(),
})

const ConfirmPrompt = BasePrompt.extend({
  type: z.literal('confirm'),
  initialValue: z.boolean().optional(),
})

const MultiSelectPrompt = BasePrompt.extend({
  type: z.literal('multiselect'),
  options: z.array(Option).min(1, 'needs at least one option'),
  initialValue: z.array(z.string()).optional(),
})

const Prompt = z.discriminatedUnion('type', [TextPrompt, SelectPrompt, ConfirmPrompt, MultiSelectPrompt])

export const ScaffoldConfig = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  ignore: z.array(z.string()).optional(),
  prompts: z.array(Prompt).optional(),
})

export type ScaffoldConfig = z.infer<typeof ScaffoldConfig>
export type Prompt = z.infer<typeof Prompt>
