import { describe, expect, it } from 'vitest'
import { FACTORY_SCENES, FACTORY_STATUS_TEXTS, getRandomScene, getRandomStatusText } from './factoryScenes.js'

describe('FACTORY_SCENES', () => {
  it('has exactly 4 scenes', () => {
    expect(FACTORY_SCENES).toHaveLength(6)
  })

  it('each scene has required properties', () => {
    for (const scene of FACTORY_SCENES) {
      expect(scene).toHaveProperty('id')
      expect(scene).toHaveProperty('label')
      expect(typeof scene.id).toBe('string')
      expect(typeof scene.label).toBe('string')
    }
  })

  it('all scene ids are unique', () => {
    const ids = FACTORY_SCENES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getRandomScene', () => {
  it('returns a scene from the list', () => {
    const scene = getRandomScene()
    expect(FACTORY_SCENES).toContainEqual(scene)
  })
})

describe('getRandomStatusText', () => {
  it('returns a string from the FACTORY_STATUS_TEXTS array', () => {
    const text = getRandomStatusText()
    expect(FACTORY_STATUS_TEXTS).toContain(text)
  })
})
