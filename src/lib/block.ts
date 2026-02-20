import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import type { WorkspaceConfig } from "./schemas.ts";

const VERSION = "0.2.1";
const START_MARKER = "<!-- dunelin:start -->";
const END_MARKER = "<!-- dunelin:end -->";

/**
 * Generate the dunelin block content based on workspace config.
 */
function generateBlock(config: Partial<WorkspaceConfig>): string {
  const hasShadow = config.shadow === true;

  let block = `${START_MARKER}
> **Dunelin v${VERSION}** — This block is managed by [Dunelin](https://github.com/vaileamon/dunelin) and updated automatically.
> If you see another dunelin block in this file, please remove it (keep this one).

## Workspace Management
This workspace is managed by Dunelin. Configuration lives in \`.dunelin/config.json\`.

An MCP server is configured in \`.mcp.json\` — AI tools can query workspace structure programmatically:
- \`dunelin_get_workspace\` — root context + project list
- \`dunelin_get_project\` — project context, team, metadata
- \`dunelin_list_projects\` — all projects overview
`;

  if (hasShadow) {
    block += `
## Context Persistence
This workspace uses a **shadow repo** (\`.dunelin/shadow/\`) to version and share context via git.

**When you update context files** (CLAUDE.md, HUMANS.md, changelog entries):
1. Edit the file inside \`.dunelin/shadow/\` — this is the canonical copy
2. Commit: \`cd .dunelin/shadow && git add -A && git commit -m "update context"\`
3. Push: \`git push\`
4. Run \`dunelin update\` to sync changes to workspace root

Never edit context files at workspace root directly — they get overwritten by \`dunelin update\`.
`;
  } else {
    block += `
## Context Persistence
This workspace does not have a shadow repo. Edit context files directly at workspace root.
To enable versioned context, recreate this workspace from a git template (\`dunelin init\`).
`;
  }

  block += `
## Workspace Structure
\`\`\`
.dunelin/config.json              — workspace config (managed by dunelin)${hasShadow ? "\n.dunelin/shadow/                  — shadow repo (versioned context)" : ""}
projects/{name}/CLAUDE.md         — project context
projects/{name}/HUMANS.md         — project team
projects/{name}/dunelin.json      — project metadata (repos, status, tags)
projects/{name}/changelog/        — decision log
projects/{name}/repos/            — code repositories (cloned or linked)
\`\`\`
${END_MARKER}`;

  return block;
}

/**
 * Inject or replace the dunelin block in a context file.
 * - If markers found: replace content between them
 * - If no markers: append block at end of file
 * - If file doesn't exist: skip silently
 */
export async function injectDunelinBlock(
  filePath: string,
  config: Partial<WorkspaceConfig>
): Promise<boolean> {
  if (!existsSync(filePath)) return false;

  let content = await readFile(filePath, "utf-8");
  const block = generateBlock(config);

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing block
    content =
      content.slice(0, startIdx) +
      block +
      content.slice(endIdx + END_MARKER.length);
  } else {
    // Append to end
    content = content.trimEnd() + "\n\n" + block + "\n";
  }

  await writeFile(filePath, content, "utf-8");
  return true;
}
