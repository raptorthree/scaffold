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
        placeholder: 'my-app',
        initialValue: 'my-app'
      }]
    })
    expect(result.prompts?.[0].type).toBe('text')
  })

  test('accepts password prompt without initialValue', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'secret',
        type: 'password',
        message: 'API key?',
        mask: '*'
      }]
    })
    expect(result.prompts?.[0].type).toBe('password')
    expect((result.prompts?.[0] as any).initialValue).toBeUndefined()
  })

  test('accepts select prompt with string options', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'ui',
        type: 'select',
        message: 'UI?',
        options: ['tailwind', 'bootstrap'],
        initialValue: 'tailwind',
        maxItems: 5
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
          { value: 'tailwind', label: 'Tailwind CSS', hint: 'Recommended' },
          { value: 'none', label: 'None' }
        ]
      }]
    })
    expect(result.prompts).toHaveLength(1)
  })

  test('accepts confirm prompt with active/inactive', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'typescript',
        type: 'confirm',
        message: 'Use TypeScript?',
        active: 'Yes',
        inactive: 'No',
        initialValue: true
      }]
    })
    expect(result.prompts?.[0].type).toBe('confirm')
  })

  test('accepts multiselect prompt with all options', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'features',
        type: 'multiselect',
        message: 'Features?',
        options: ['auth', 'api', 'admin'],
        initialValue: ['auth'],
        maxItems: 10,
        required: true
      }]
    })
    expect(result.prompts?.[0].type).toBe('multiselect')
  })

  test('rejects invalid prompt name', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [{
        name: 'my-app',
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

  test('rejects select initialValue not in options', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [{
        name: 'db',
        type: 'select',
        message: 'DB?',
        options: ['sqlite', 'postgres'],
        initialValue: 'mysql'
      }]
    })).toThrow(/initialValue must match/)
  })

  test('rejects multiselect initialValue not in options', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [{
        name: 'features',
        type: 'multiselect',
        message: 'Features?',
        options: ['auth', 'api'],
        initialValue: ['auth', 'admin']
      }]
    })).toThrow(/initialValue items must match/)
  })

  test('rejects duplicate prompt names', () => {
    expect(() => ScaffoldConfig.parse({
      prompts: [
        { name: 'db', type: 'text', message: 'DB?' },
        { name: 'db', type: 'text', message: 'Database?' }
      ]
    })).toThrow(/unique/)
  })

  test('accepts select initialValue matching object option value', () => {
    const result = ScaffoldConfig.parse({
      prompts: [{
        name: 'db',
        type: 'select',
        message: 'DB?',
        options: [
          { value: 'pg', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' }
        ],
        initialValue: 'pg'
      }]
    })
    expect(result.prompts?.[0].type).toBe('select')
  })
})
