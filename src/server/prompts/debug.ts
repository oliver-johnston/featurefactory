import { globalWorkflowRules } from './common.js'

export function systemPrompt(): string {
  return [
    ...globalWorkflowRules(),
    '',
    'You are in a debugging session.',
    '',
    'Use /superpowers:systematic-debugging to debug the user\'s issue.',
    'Commit fixes as you go.',
  ].join('\n')
}

export function initialTurnInstruction(): string {
  return 'Read the task file, then use /superpowers:systematic-debugging to investigate and fix the issue.'
}

export function claudeMdRules(): string[] {
  return [
    '- **Workflow**: Use /superpowers:systematic-debugging to debug the issue.',
    '- **Always commit fixes** as you go.',
  ]
}
