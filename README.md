# 💎 Dunelin

> **Beta** — Dunelin is under active development. Expect breaking changes.

Your AI tools start every session cold. No memory of your architecture, team, terms, or decisions. You repeat yourself endlessly.

Dunelin fixes this. It scaffolds an opinionated workspace with **context files** that AI tools read natively. Your AI agent knows everything from the first prompt.

For teams, Dunelin goes further: a **shadow repo** versions and syncs context via git. Your team's knowledge stays current across every session, every machine, every tool.

Works with Claude Code, Cursor, Windsurf, and any tool that reads context files.

---

## Quick Start

```bash
dunelin init my-workspace
```

The interactive setup asks you to choose between a **built-in template** or a **custom git template**, then scaffolds the workspace. Open it in your editor — your AI tool reads the context automatically.

---

## Install

Download the latest binary from [GitHub Releases](https://github.com/vaileamon/dunelin/releases/latest):

**macOS (Apple Silicon):**
```bash
curl -L https://github.com/vaileamon/dunelin/releases/latest/download/dunelin-darwin-arm64 -o ~/.local/bin/dunelin && chmod +x ~/.local/bin/dunelin
```

**macOS (Intel):**
```bash
curl -L https://github.com/vaileamon/dunelin/releases/latest/download/dunelin-darwin-x64 -o ~/.local/bin/dunelin && chmod +x ~/.local/bin/dunelin
```

**Linux (x64):**
```bash
curl -L https://github.com/vaileamon/dunelin/releases/latest/download/dunelin-linux-x64 -o ~/.local/bin/dunelin && chmod +x ~/.local/bin/dunelin
```

No runtime dependencies. Single binary, no sudo.

> **First time using `~/.local/bin`?** Create it and add it to your PATH:
> ```bash
> mkdir -p ~/.local/bin
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc  # or ~/.bashrc
> source ~/.zshrc
> ```

<details>
<summary><strong>macOS: "cannot be opened" warning</strong></summary>

macOS blocks unsigned binaries downloaded from the internet. Remove the quarantine flag:

```bash
xattr -d com.apple.quarantine ~/.local/bin/dunelin
```
</details>

---

## How It Works

### Context Files

Dunelin generates structured markdown files that AI tools pick up automatically:

```
my-workspace/
├── CLAUDE.md               ← workspace-wide context (you, your projects, terms)
├── .mcp.json                ← MCP server config (auto-discovered by AI tools)
├── .dunelin/
│   └── config.json          ← workspace configuration
└── projects/
    └── my-project/
        ├── CLAUDE.md        ← project context (architecture, stack, concepts)
        ├── HUMANS.md        ← team members on this project
        ├── dunelin.json     ← project metadata (repos, status, tags)
        ├── changelog/       ← decision log, session summaries
        └── repos/           ← cloned code repositories
```

Your AI tool reads these files at session start. No more explaining your codebase every time.

### Shadow Repo

When you create a workspace from a **git template**, Dunelin keeps the full clone inside `.dunelin/shadow/` — with `.git/` intact. This is the canonical, version-controlled copy of your context.

```
.dunelin/
├── config.json
└── shadow/                  ← git clone of your template
    ├── .git/                ← full git history
    ├── CLAUDE.md            ← AI edits here, commits, pushes
    └── projects/
        └── ...
```

**The workflow:**
1. AI edits context files in `.dunelin/shadow/`
2. AI commits and pushes
3. Run `dunelin update` to sync changes to workspace root
4. Your team pulls the same context on their machines

This gives you **versioned, collaborative context** without making the workspace itself a git repo. Code repos under `projects/*/repos/` are untouched.

No shadow? No problem. Workspaces from built-in templates work without git — just edit files directly.

---

## CLI Reference

```
dunelin — scaffold and manage agentic workspaces

Usage:
  dunelin init [name]    Set up a new workspace (interactive)
  dunelin update         Pull latest context from shadow repo
  dunelin mcp            Start the MCP server (stdio)
  dunelin --help         Show this help
```

### `dunelin init [name]`

Interactive workspace setup. Two forms:

| Usage | Behavior |
|-------|----------|
| `dunelin init my-workspace` | Creates a `my-workspace/` folder and scaffolds inside it |
| `dunelin init` | Scaffolds in the current directory (uses folder name as workspace name) |

Two setup paths:

**Built-in template** — Pick a template, fill in your name and role, choose your AI tool. Dunelin scaffolds the workspace with the correct context file format.

**Git template** — Provide a git URL. Dunelin clones it as a shadow repo, copies files to workspace root, and offers to clone any code repos defined in project metadata.

### `dunelin update`

Pulls the latest context from the shadow repo and syncs to workspace root.

```
$ dunelin update

Pulling latest context...
  ✓ Pulled latest changes.

Found 2 changes:
  ~ CLAUDE.md (modified)
  + projects/newproject/CLAUDE.md (added)

? Apply changes?
  > Apply all
  > Let me pick
  > Skip
```

Only available for workspaces created from a git template. Respects `updateIgnore` patterns in config (defaults to `**/repos`).

### `dunelin mcp`

Starts the MCP server over stdio. Not called directly — your AI tool invokes it automatically through `.mcp.json`.

**Tools exposed:**

| Tool | Input | Returns |
|------|-------|---------|
| `dunelin_get_workspace` | — | Root context file + project list |
| `dunelin_get_project` | `{ project: string }` | Project context + team + metadata |
| `dunelin_list_projects` | — | All projects with name, description, status, repos |

---

## Templates

### Built-in: Base

The **Base** template ships with Dunelin. Generic — usable by anyone:

```
CLAUDE.md                          ← workspace context
.mcp.json                          ← MCP auto-config
.dunelin/config.json               ← workspace metadata
projects/
  example/                         ← example project (replace with your own)
    CLAUDE.md
    HUMANS.md
    dunelin.json
    changelog/
```

### Custom Git Templates

Point `dunelin init` at any git repo containing a workspace structure:

```bash
dunelin init my-workspace
# → select "Use a git template"
# → paste: git@github.com:company/workspace-template.git
```

Dunelin clones the repo as a shadow, copies files to workspace root, and scans all `dunelin.json` files for a `repos` property. If found, it offers to clone those repos.

This is how teams maintain their own opinionated workspace structures — specific projects, pre-configured context, repo references — while using Dunelin as the scaffolding engine.

---

## Configuration

### `.dunelin/config.json`

```json
{
  "version": "0.2.0",
  "contextFile": "CLAUDE.md",
  "template": "base",
  "templateUrl": null,
  "shadow": false,
  "updateIgnore": ["**/repos"],
  "createdAt": "2026-02-18T00:00:00Z",
  "updatedAt": "2026-02-18T00:00:00Z"
}
```

| Field | Description |
|-------|-------------|
| `contextFile` | Name of the context file (`CLAUDE.md`, `.cursorrules`, or custom) |
| `template` | Template used (`base`, `custom`) |
| `templateUrl` | Git URL if a custom template was used |
| `shadow` | Whether a shadow repo exists |
| `updateIgnore` | Glob patterns for paths `dunelin update` should skip |

### Project `dunelin.json`

```json
{
  "name": "my-project",
  "description": "Financial data platform",
  "status": "active",
  "repos": [
    { "name": "api", "url": "git@github.com:company/api.git" },
    { "name": "web", "url": "git@github.com:company/web.git" }
  ],
  "tags": ["consultancy"]
}
```

---

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev -- init my-test          # run dunelin init
bun run dev -- update                # run dunelin update
bun run dev -- mcp                   # run MCP server
bun run build                        # compile to native binary
bun run typecheck                    # type-check without emitting
```

---

## License

MIT
