# Feature Factory

Feature Factory is a local-first AI coding tool for software development. You describe a task, and it spawns an AI coding session inside an isolated Git worktree. A browser Kanban board gives you a live view of each session's chat and progress.

All state lives in plain files. No database. No cloud.

## Key Concepts

- **Sessions** — Each session describes one unit of work: a title, assigned repos, AI provider/model, and current status.
- **Worktrees** — Each active session gets its own Git worktree (`feat/<TASK-ID>-<slug>`), so sessions work in isolation.

## Prerequisites

- Node.js 20+
- Git
- One or both AI CLIs installed and on your PATH:
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude --help`)
  - [Codex CLI](https://github.com/openai/codex) (`codex --help`)

## Install

```bash
git clone https://github.com/oliver-johnston/feature-factory.git
cd feature-factory
./install.sh
```

This installs dependencies, builds the project, and links the `feature-factory` CLI globally.

## Run

Start Feature Factory from the root of any Git repository:

```bash
feature-factory
```

For development (hot-reload server + Vite dev server):

```bash
npm run dev
```

The UI is available at [http://localhost:3002](http://localhost:3002).

## How to Use

1. Start Feature Factory in your repository.
2. Open the browser UI and click "New Session".
3. Give the session a title, select a repo, pick an AI provider and model.
4. The orchestrator creates a worktree and spawns the AI session.
5. Watch the session work in real time via the chat view.
6. When done, merge the branch or create a PR from the UI.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `HOST` | `0.0.0.0` | Bind address (use `127.0.0.1` on untrusted networks) |
