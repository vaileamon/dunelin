# 💎 Dunelin

> **Beta** — Dunelin is under active development. Expect breaking changes.

Scaffold and manage agentic workspaces.

AI coding tools start every session cold — no knowledge of your codebase, team, terms, or architecture. Dunelin creates an opinionated workspace structure with context files that AI tools read natively, plus an MCP server for programmatic access.

Works with Claude Code, Cursor, Windsurf, and any tool that reads context files.

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

## Quick Start

```bash
# Create a new workspace in a subfolder
dunelin init my-workspace

# Or initialize the current directory as a workspace
mkdir my-workspace && cd my-workspace
dunelin init
```

The interactive setup will ask you to choose between a **built-in template** or a **custom git template**, then scaffold the workspace.

---

## CLI Reference

```
dunelin — scaffold and manage agentic workspaces

Usage:
  dunelin init [name]    Set up a new workspace (interactive)
  dunelin mcp            Start the MCP server (stdio)
  dunelin --help         Show this help
```

### `dunelin init [name]`

Interactive workspace setup. Two forms:

| Usage | Behavior |
|-------|----------|
| `dunelin init my-workspace` | Creates a `my-workspace/` folder and scaffolds inside it |
| `dunelin init` | Scaffolds in the current directory (uses folder name as workspace name) |

The command offers two setup paths:

**Built-in template** — Pick a template shipped with Dunelin, fill in your name and role, choose your AI tool. Dunelin scaffolds the workspace and configures the correct context file format.

**Custom git template** — Provide a git URL to your own workspace template. Dunelin clones it, detects any project repos defined in `dunelin.json` metadata, and offers to clone them.

### `dunelin mcp`

Starts the MCP server over stdio. Not called directly — your AI tool invokes it automatically through the `.mcp.json` config file that Dunelin generates in your workspace root.

**Tools exposed:**

| Tool | Input | Returns |
|------|-------|---------|
| `dunelin_get_workspace` | — | Root context file content + list of all projects (name, description, status) |
| `dunelin_get_project` | `{ project: string }` | Project context file + HUMANS.md + dunelin.json metadata |
| `dunelin_list_projects` | — | All projects with name, description, status, and repos |

The MCP server reads from `DUNELIN_WORKSPACE` env var (set in `.mcp.json`) or falls back to `cwd`.

---

## Workspace Structure

A Dunelin workspace looks like this:

```
my-workspace/
├── CLAUDE.md               ← root context file (workspace-wide)
├── .mcp.json                ← MCP server config (auto-discovered by AI tools)
├── dunelin.json             ← workspace metadata
└── projects/
    └── my-project/
        ├── CLAUDE.md        ← project-specific context
        ├── HUMANS.md        ← team members on this project
        ├── dunelin.json     ← project metadata (repos, status, tags)
        ├── changelog/       ← decision log, session summaries
        └── repos/           ← cloned code repositories
            ├── api/
            └── web/
```

**Context files** are the core concept — structured markdown files that AI tools read automatically at session start. They contain your architecture, tech stack, team, terms, and conventions. No more repeating yourself every session.

**The context filename is configurable:** `CLAUDE.md` (Claude Code), `.cursorrules` (Cursor), or any custom filename. Chosen during `dunelin init` and stored in the root `dunelin.json`.

---

## Templates

Templates define the workspace structure: which files exist, where they go, what content they have.

### Built-in: Base

The **Base** template ships with Dunelin. It's generic — usable by any team or individual. It scaffolds:

```
CLAUDE.md                          ← root context (your name, role, project table, terms, tools)
.mcp.json                          ← MCP server auto-config
dunelin.json                       ← workspace metadata
projects/
  example/                         ← example project (shows the structure)
    CLAUDE.md                      ← project context (architecture, tech stack, key concepts)
    HUMANS.md                      ← project team (members, roles, working preferences)
    dunelin.json                   ← project metadata
    changelog/                     ← decision log
```

Placeholders like `{Workspace Name}`, `{Name}`, and `{Role}` are filled in during setup.

The `projects/example/` folder demonstrates the structure — replace it with your own projects.

### Custom Git Templates

Point `dunelin init` at any git repo containing a workspace structure:

```bash
dunelin init my-workspace
# → select "Use a git template"
# → paste: git@github.com:company/workspace-template.git
```

Dunelin clones the repo, strips `.git`, and scans all `dunelin.json` files for a `repos` property. If found, it offers to clone those repos into each project's `repos/` directory.

This is how teams maintain their own opinionated workspace structures — specific projects, pre-configured context files, repo references — while using Dunelin as the scaffolding engine.

---

## Configuration

### Root `dunelin.json`

```json
{
  "version": "1.0.0",
  "contextFile": "CLAUDE.md",
  "template": "base",
  "templateUrl": null,
  "createdAt": "2026-02-17T00:00:00.000Z",
  "updatedAt": "2026-02-17T00:00:00.000Z"
}
```

| Field | Description |
|-------|-------------|
| `version` | Config schema version |
| `contextFile` | Name of the context file (`CLAUDE.md`, `.cursorrules`, or custom) |
| `template` | Template used (`base`, `custom`) |
| `templateUrl` | Git URL if a custom template was used |
| `createdAt` | Workspace creation timestamp |
| `updatedAt` | Last modification timestamp |

### Project `dunelin.json`

```json
{
  "name": "my-project",
  "description": "Financial data platform for accountants",
  "status": "active",
  "repos": [
    { "name": "api", "url": "git@github.com:company/api.git" },
    { "name": "web", "url": "git@github.com:company/web.git" }
  ],
  "tags": ["consultancy"]
}
```

| Field | Description |
|-------|-------------|
| `name` | Project name (matches folder name) |
| `description` | Short project description |
| `status` | Current status (e.g., `active`, `archived`, `idea`) |
| `repos` | Code repositories — Dunelin clones these into `repos/` |
| `tags` | Freeform tags for organization |

### `.mcp.json`

Generated automatically. Tells AI tools how to invoke the Dunelin MCP server:

```json
{
  "mcpServers": {
    "dunelin": {
      "command": "dunelin",
      "args": ["mcp"],
      "env": {
        "DUNELIN_WORKSPACE": "."
      }
    }
  }
}
```

---

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev -- init my-test          # run dunelin init
bun run dev -- mcp                   # run MCP server
bun run build                        # compile to native binary
bun run typecheck                    # type-check without emitting
```

---

## License

MIT
