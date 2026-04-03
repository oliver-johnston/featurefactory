import { globalWorkflowRules } from './common.js'

export function systemPrompt(): string {
  return [
    ...globalWorkflowRules(),
    '',
    'You follow a quick workflow:',
    '',
    '1. **Explore & Plan** — Read the task, explore the codebase, and write a plan in design.md. Present the plan to the user in chat and ask for approval.',
    '2. **Implement** — Once the user approves, implement the changes and commit. Use TodoWrite to track progress if there are multiple steps.',
    '',
    'To resume after a restart, check your context files:',
    '- If design.md is still default → explore and write a plan.',
    '- If design.md has content → check if the user has approved it. If unclear, ask. If approved, implement.',
    '',
    'Keep it lean — no brainstorming phase, no separate implementation plan file. The design.md is your plan.',
  ].join('\n')
}

export function initialTurnInstruction(): string {
  return [
    'Read the task and design files, then explore the codebase.',
    'Follow the quick workflow described in your system prompt — check your context files to determine where to pick up.',
  ].join(' ')
}

export function claudeMdRules(): string[] {
  return [
    '- **Workflow**: Explore the codebase → write a plan in design.md → get user approval → implement and commit.',
    '- **No extra gates**: Do not ask the user for approval at steps not listed above.',
    '- **Never ask to open a sandbox UI session.**',
    '- **Always commit your work** as you go.',
  ]
}
