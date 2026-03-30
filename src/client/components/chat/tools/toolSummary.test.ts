import { describe, expect, it } from 'vitest'
import { getToolSummary, getToolIcon } from './toolSummary.js'

describe('getToolSummary', () => {
  it('summarizes Read tool', () => {
    expect(getToolSummary('Read', { file_path: '/src/App.tsx' })).toBe('Read src/App.tsx')
  })

  it('summarizes Edit tool', () => {
    expect(getToolSummary('Edit', { file_path: '/src/App.tsx', old_string: 'foo', new_string: 'bar' })).toBe('Edit src/App.tsx')
  })

  it('summarizes Write tool', () => {
    expect(getToolSummary('Write', { file_path: '/src/new.ts', content: '...' })).toBe('Write src/new.ts')
  })

  it('summarizes Bash with command', () => {
    expect(getToolSummary('Bash', { command: 'npm test' })).toBe('npm test')
  })

  it('truncates long Bash commands', () => {
    const longCmd = 'a'.repeat(100)
    const result = getToolSummary('Bash', { command: longCmd })
    expect(result.length).toBeLessThanOrEqual(60)
    expect(result.endsWith('…')).toBe(true)
  })

  it('summarizes Grep tool', () => {
    expect(getToolSummary('Grep', { pattern: 'TODO', glob: '*.ts' })).toBe('Grep "TODO" *.ts')
  })

  it('summarizes Grep without glob', () => {
    expect(getToolSummary('Grep', { pattern: 'TODO' })).toBe('Grep "TODO"')
  })

  it('summarizes Glob tool', () => {
    expect(getToolSummary('Glob', { pattern: '**/*.tsx' })).toBe('Glob **/*.tsx')
  })

  it('summarizes Agent tool', () => {
    expect(getToolSummary('Agent', { description: 'Find auth code' })).toBe('Agent: Find auth code')
  })

  it('summarizes WebSearch tool', () => {
    expect(getToolSummary('WebSearch', { query: 'react hooks' })).toBe('Search "react hooks"')
  })

  it('summarizes WebFetch tool', () => {
    expect(getToolSummary('WebFetch', { url: 'https://example.com/api' })).toBe('Fetch example.com/api')
  })

  it('summarizes Skill tool', () => {
    expect(getToolSummary('Skill', { skill: 'commit' })).toBe('Skill: commit')
  })

  it('summarizes TodoWrite tool', () => {
    expect(getToolSummary('TodoWrite', { todos: [] })).toBe('Updated tasks')
  })

  it('falls back for unknown tools', () => {
    expect(getToolSummary('CustomTool', { foo: 'bar' })).toBe('CustomTool')
  })
})

describe('getToolIcon', () => {
  it('returns correct icons', () => {
    expect(getToolIcon('Read')).toBe('📄')
    expect(getToolIcon('Edit')).toBe('✏️')
    expect(getToolIcon('Write')).toBe('📝')
    expect(getToolIcon('Bash')).toBe('▶')
    expect(getToolIcon('Grep')).toBe('🔍')
    expect(getToolIcon('Glob')).toBe('📂')
    expect(getToolIcon('Agent')).toBe('🤖')
    expect(getToolIcon('WebSearch')).toBe('🌐')
    expect(getToolIcon('WebFetch')).toBe('🌐')
    expect(getToolIcon('Skill')).toBe('⚡')
    expect(getToolIcon('TodoWrite')).toBe('✓')
    expect(getToolIcon('UnknownTool')).toBe('🔧')
  })
})
