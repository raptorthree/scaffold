import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = join(import.meta.dirname, '..')
const TMP = join(ROOT, '.test-tmp')
const TEMPLATE = join(TMP, 'template')
const OUTPUT = join(TMP, 'output')

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TEMPLATE, { recursive: true })
  mkdirSync(OUTPUT, { recursive: true })
  mkdirSync(join(TEMPLATE, '.scaffold'), { recursive: true })
  mkdirSync(join(TEMPLATE, 'tmp'), { recursive: true })

  writeFileSync(join(TEMPLATE, 'index.js'), 'console.log("hello")')
  writeFileSync(join(TEMPLATE, 'package.json'), '{"name": "test"}')
  writeFileSync(join(TEMPLATE, 'temperature.txt'), 'should NOT be ignored')
  writeFileSync(join(TEMPLATE, 'tmp', 'cache.txt'), 'should be ignored')
  writeFileSync(join(TEMPLATE, '.scaffold', 'config.json'), JSON.stringify({
    name: 'test-template',
    ignore: ['*.log', 'tmp']
  }))
  writeFileSync(join(TEMPLATE, 'debug.log'), 'should be ignored')
})

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('scaffold', () => {
  test('scaffolds from local path', () => {
    execSync(`bun run ${ROOT}/src/index.ts test-project --from ${TEMPLATE}`, {
      cwd: OUTPUT,
    })

    expect(existsSync(join(OUTPUT, 'test-project'))).toBe(true)
    expect(existsSync(join(OUTPUT, 'test-project/index.js'))).toBe(true)
    expect(existsSync(join(OUTPUT, 'test-project/package.json'))).toBe(true)
  })

  test('ignores files from config', () => {
    expect(existsSync(join(OUTPUT, 'test-project/debug.log'))).toBe(false)
  })

  test('excludes .scaffold folder', () => {
    expect(existsSync(join(OUTPUT, 'test-project/.scaffold'))).toBe(false)
  })

  test('ignores directory by name', () => {
    expect(existsSync(join(OUTPUT, 'test-project/tmp'))).toBe(false)
  })

  test('does not ignore partial name matches', () => {
    // "tmp" pattern should not match "temperature.txt"
    expect(existsSync(join(OUTPUT, 'test-project/temperature.txt'))).toBe(true)
  })

  test('rejects existing directory', () => {
    expect(() => {
      execSync(`bun run ${ROOT}/src/index.ts test-project --from ${TEMPLATE}`, {
        cwd: OUTPUT,
        stdio: 'pipe',
      })
    }).toThrow()
  })
})
