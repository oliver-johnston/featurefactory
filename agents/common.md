# Shared Agent Conventions

These rules apply to every agent equally. Agent-specific persona, workflow, and standards are in each agent's own prompt file.

---

## Starting a session

**The very first thing you must do — before reading files, before exploring the codebase, before any explanation — is locate your task file and set its status to `in_progress`.**

Your task file path is in the system prompt under `Task File:`. Use the Edit tool to change `status: todo` to `status: in_progress` immediately.

Do not skip this step. Do not defer it. Do it first.

---

## Worktree context

You run inside a Git worktree. Your task file path and worktree path are provided in the system prompt via `--append-system-prompt`.

---

## Task file interaction

- **Exception:** Setting `status: in_progress` is the one edit you make before reading — you know the path from the system prompt, and the field name is always the same.
- For all other edits, read the task file first — use the **absolute path** from `Task File:` in your brief.
- Always preserve YAML structure; edit fields in place.
- **Never add a key that already exists** — YAML does not allow duplicate keys. If a field already exists, edit it; do not create a duplicate.
- **YAML string safety** — when editing list fields (`acceptance_criteria`, `checklist`, `comments`, etc.), wrap any value in single quotes if it contains or starts with a backtick, double-quote, or colon. Example: `- '`HomePage.tsx` no longer exists'`, not `- `HomePage.tsx` no longer exists`.
- **Comments before status changes** — when editing a task file, always write comments first. Only change `status` or `assigned_agent` after all other edits are complete. These two fields are always the very last edits made to a task file. No exceptions.

---

## Comment format

Comments on a task file follow this schema:

```yaml
comments:
  - id: <short unique identifier, e.g. "c001">
    ts: <ISO 8601 timestamp, e.g. "2025-01-15T10:30:00Z">
    author: <agent id, e.g. "backend_engineer">
    kind: <see valid kinds below>
    body: |
      <free text>
```

**Valid `kind` values:**

| kind | meaning |
|------|---------|
| `note` | general observation or approval |
| `question` | reviewer feedback requesting changes |
| `handoff` | agent is passing work to the next agent |

---

## Git conventions

- Commit message format: `<type>: <short description>` — e.g. `feat: add user login`, `fix: handle null task id`
- Never force-push to `master` or `main`.
- Never use `--no-verify` to skip hooks.
- Prefer creating a new commit over amending an existing one.
- To check what you have committed beyond the main branch: `git log master..HEAD --oneline` (use `main` if that is the default branch name).

---

## Tool preferences

Always use the dedicated tool rather than a shell command when one exists:

| Task | Use | Not |
|------|-----|-----|
| Find files by name/pattern | `Glob` | `find`, `ls` |
| Search file contents | `Grep` | `grep`, `rg` |
| Read a file | `Read` | `cat`, `head`, `tail` |
| Edit a file | `Edit` | `sed`, `awk` |
| Write a new file | `Write` | `echo >`, `cat <<EOF` |

---

## Finishing workflow

When you have completed implementation work:

1. Append an entry to the existing `contributions` list in the task file (use the Edit tool):
   ```yaml
     - agent: <your agent id>
       ts: "2025-01-15T10:30:00Z"
       summary: "<one-liner — keep under 80 characters>"
   ```
   (The `contributions:` key already exists — do not re-declare it.)
2. Commit all changes: `git add -A && git commit -m "feat: <short description>"`
3. Check whether you have any commits beyond the main branch: `git log master..HEAD --oneline`
4. **If you have commits** — hand off to the reviewer:
   - Add a `kind: handoff` comment to the task file with your agent ID and a brief summary of what you built.
   - Set `assigned_agent: pr_reviewer`.
   - Keep `status: in_progress` — do NOT set `done`; the reviewer will do that.
5. **If you have no commits** — set `status: done` directly.
