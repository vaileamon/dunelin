/**
 * Embedded template files for the Base template.
 * These are bundled into the binary so no filesystem lookup is needed at runtime.
 */

export interface TemplateFile {
  path: string; // relative path within the workspace
  content: string;
}

export const BASE_TEMPLATE: TemplateFile[] = [
  {
    path: "CLAUDE.md",
    content: `# {Workspace Name}

## Me
{Name}, {Role}.

## Projects
| Name | Description | Status |
|------|-------------|--------|

> Each project has its own context file in projects/{name}/

## Terms
| Term | Meaning |
|------|---------|

## Tools & Integrations
| Tool | Used for |
|------|----------|
| Dunelin | Workspace scaffolding and context management |

## Workspace Management
This workspace is managed by [Dunelin](https://dunelin.com). An MCP server is configured
in \`.mcp.json\` — AI tools can query workspace structure and project context programmatically.

Available MCP tools:
- \`dunelin_get_workspace\` — root context + project list
- \`dunelin_get_project\` — project context, team, metadata
- \`dunelin_list_projects\` — all projects overview

## Workspace Structure
\`\`\`
projects/{name}/CLAUDE.md     — project context
projects/{name}/HUMANS.md     — project team
projects/{name}/dunelin.json  — project metadata (repos, status, tags)
projects/{name}/changelog/    — decision log
projects/{name}/repos/        — code repositories (cloned or linked)
\`\`\`
`,
  },
  {
    path: "dunelin.json",
    content: `{
  "version": "1.0.0",
  "contextFile": "CLAUDE.md",
  "template": "base",
  "templateUrl": null,
  "createdAt": "",
  "updatedAt": ""
}
`,
  },
  {
    path: ".mcp.json",
    content: `{
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
`,
  },
  {
    path: "projects/example/CLAUDE.md",
    content: `# Example Project

## Overview
This is an example project showing the dunelin workspace structure. Replace or delete this folder and create your own projects.

**Status:** Active
**Repo(s):** See [dunelin.json](./dunelin.json) for repository metadata.

## Architecture
[To be filled]

## Tech Stack
[To be filled]

## Key Concepts
| Term | Meaning |
|------|---------|

## Project Files
- [HUMANS.md](./HUMANS.md) — team members working on this project
- [dunelin.json](./dunelin.json) — project metadata (repos, status, tags)
- [changelog/](./changelog/) — decision log and session summaries
`,
  },
  {
    path: "projects/example/HUMANS.md",
    content: `# Example Project — Team

## Members
| Name | Role | Email |
|------|------|-------|

## Working Preferences
- [To be filled]
`,
  },
  {
    path: "projects/example/dunelin.json",
    content: `{
  "name": "example",
  "description": "Example project showing the dunelin structure",
  "status": "active",
  "repos": [],
  "tags": []
}
`,
  },
  {
    path: "projects/example/changelog/.gitkeep",
    content: "",
  },
];
