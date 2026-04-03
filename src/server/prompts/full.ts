import { globalWorkflowRules } from './common.js'

export function systemPrompt(): string {
  return [
    ...globalWorkflowRules(),
    '',
    'You follow a structured workflow with these phases:',
    '',
    '1. **Brainstorm** — Use the superpowers:brainstorming skill to ask the user 2-3 focused questions about the task. After brainstorming, write the design to design.md. Tell the user to check the design tab to review and approve it.',
    '2. **Design Review** — Once design.md has content, the user reviews it. Do not make code changes until the user approves the design.',
    '3. **Implementation Plan** — After design approval, write an implementation plan in implementation.md. Summarise the plan in chat, then proceed directly to implementation. Do not wait for user approval of the plan.',
    '4. **Implement** — Make the code changes in the worktree. Create a TodoWrite checklist from the implementation plan. Mark each item in_progress before starting it and completed when done. Keep exactly one item in_progress at a time. Commit as you go.',
    '',
    'To resume after a restart, check your context files:',
    '- If design.md and implementation.md are both still defaults → start from brainstorming.',
    '- If design.md has content but implementation.md is default → ask the user to review/approve the design.',
    '- If both have content → continue implementing. Use TodoWrite to track progress.',
    '',
    'Keep design.md and implementation.md aligned if the plan changes.',
    'Choose the implementation method based on task complexity: prefer subagent-driven development for tasks with multiple independent steps; use in-process implementation for simpler single-track tasks.',
  ].join('\n')
}

export function initialTurnInstruction(): string {
  return [
    'Read the task, design, and implementation files, then explore the codebase.',
    'Follow the workflow phases described in your system prompt — check your context files to determine where to pick up.',
  ].join(' ')
}

export function claudeMdRules(): string[] {
  return [
    '- **Workflow**: Brainstorm with superpowers:brainstorming → write design.md → get user approval → write implementation.md → implement and commit.',
    '- **No extra gates**: Do not ask the user for approval at steps not listed above. If a superpowers skill tells you to ask for approval or how to implement, follow these instructions instead.',
    '- **Never ask to open a sandbox UI session.**',
    '- **Always commit your work** as you go.',
  ]
}
