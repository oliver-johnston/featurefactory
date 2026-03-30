export interface FactoryScene {
  id: string
  label: string
}

export const FACTORY_SCENES: FactoryScene[] = [
  { id: 'worker', label: 'Worker carrying a box' },
  { id: 'forklift', label: 'Forklift in motion' },
  { id: 'conveyor', label: 'Conveyor belt' },
  { id: 'gears', label: 'Pulling a lever' },
  { id: 'welder', label: 'Welding metal' },
  { id: 'anvil', label: 'Hammering on an anvil' },
]

export function getRandomScene(): FactoryScene {
  return FACTORY_SCENES[Math.floor(Math.random() * FACTORY_SCENES.length)]
}

export const FACTORY_STATUS_TEXTS = [
  'Reticulating splines…',
  'Calibrating flux capacitor…',
  'Herding cats…',
  'Consulting the oracle…',
  'Aligning covariance matrices…',
  'Untangling spaghetti code…',
  'Warming up the hamster wheel…',
  'Compressing time crystals…',
  'Defragmenting the cloud…',
  'Polishing pixels…',
  'Negotiating with the compiler…',
  'Spinning up extra dimensions…',
  'Bribing the scheduler…',
  'Reversing the entropy…',
  'Counting backwards from infinity…',
]

export function getRandomStatusText(): string {
  return FACTORY_STATUS_TEXTS[Math.floor(Math.random() * FACTORY_STATUS_TEXTS.length)]
}
