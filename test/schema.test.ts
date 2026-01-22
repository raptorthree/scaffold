import { describe, test, expect } from 'bun:test'
import { ScaffoldConfig } from '../src/schema'

describe('ScaffoldConfig schema', () => {
  test('accepts minimal config', () => {
    const result = ScaffoldConfig.parse({})
    expect(result).toEqual({})
  })

  test('accepts full config without prompts', () => {
    const result = ScaffoldConfig.parse({
      name: 'my-stack',
      description: 'A stack',
      ignore: ['node_modules', '*.log']
    })
    expect(result.name).toBe('my-stack')
    expect(result.ignore).toEqual(['node_modules', '*.log'])
  })

  test('accepts text prompt', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'app_name',
        type: 'text',
        message: 'App name?',
        initialValue: 'my-app'
      }]
    })
    expect(result.prompts?.[0].type).toBe('text')
  })

  test('accepts select prompt with string options', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'ui',
        type: 'select',
        message: 'UI?',
        options: ['tailwind', 'bootstrap'],
        initialValue: 'tailwind'
      }]
    })
    expect(result.prompts?.[0].type).toBe('select')
  })

  test('accepts select prompt with object options', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'ui',
        type: 'select',
        message: 'UI?',
        options: [
          { value: 'tailwind', label: 'Tailwind CSS' },
          { value: 'none', label: 'None' }
        ]
      }]
    })
    expect(result.prompts).toHaveLength(1)
  })

  test('accepts confirm prompt', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'typescript',
        type: 'confirm',
        message: 'Use TypeScript?',
        initialValue: true
      }]
    })
    expect(result.prompts?.[0].type).toBe('confirm')
  })

  test('accepts multiselect prompt', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'features',
        type: 'multiselect',
        message: 'Features?',
        options: ['auth', 'api', 'admin'],
        initialValue: ['auth']
      }]
    })
    expect(result.prompts?.[0].type).toBe('multiselect')
  })

  test('rejects invalid prompt name', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [{
        name: 'my-app', // invalid: has dash
        type: 'text',
        message: 'Name?'
      }]
    })).toThrow()
  })

  test('rejects select without options', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [{
        name: 'ui',
        type: 'select',
        message: 'UI?'
      }]
    })).toThrow()
  })

  test('rejects empty options array', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [{
        name: 'ui',
        type: 'select',
        message: 'UI?',
        options: []
      }]
    })).toThrow()
  })
})
