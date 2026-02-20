import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getContextFilename,
  readTextFile,
  readProjectConfig,
  listProjects,
} from "../lib/workspace.ts";
import { join } from "path";

function getWorkspacePath(): string {
  return process.env.DUNELIN_WORKSPACE || process.cwd();
}

export async function runMcp(): Promise<void> {
  const server = new McpServer({
    name: "dunelin",
    version: "0.2.1",
  });

  // ─── dunelin_get_workspace ──────────────────────────────────────────────

  server.tool(
    "dunelin_get_workspace",
    "Returns the root workspace context file content and a list of all projects with their name, description, and status.",
    {},
    async () => {
      const workspacePath = getWorkspacePath();
      const contextFile = await getContextFilename(workspacePath);
      const contextContent = await readTextFile(
        join(workspacePath, contextFile)
      );
      const projects = await listProjects(workspacePath);

      const projectList = projects.map((p) => ({
        name: p.config.name,
        description: p.config.description,
        status: p.config.status,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                contextFile,
                context: contextContent,
                projects: projectList,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── dunelin_get_project ────────────────────────────────────────────────

  server.tool(
    "dunelin_get_project",
    "Returns a specific project's context file content, HUMANS.md content, and dunelin.json metadata including repos, status, and tags.",
    { project: z.string().describe("Project name (folder name under projects/)") },
    async ({ project }) => {
      const workspacePath = getWorkspacePath();
      const projectPath = join(workspacePath, "projects", project);
      const contextFile = await getContextFilename(workspacePath);

      const contextContent = await readTextFile(
        join(projectPath, contextFile)
      );
      const humansContent = await readTextFile(
        join(projectPath, "HUMANS.md")
      );

      const config = await readProjectConfig(projectPath);

      if (!config && !contextContent) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Project "${project}" not found.` }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                project,
                context: contextContent,
                humans: humansContent,
                metadata: config,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── dunelin_list_projects ──────────────────────────────────────────────

  server.tool(
    "dunelin_list_projects",
    "Lists all projects in the workspace with their name, description, status, and repos.",
    {},
    async () => {
      const workspacePath = getWorkspacePath();
      const projects = await listProjects(workspacePath);

      const projectList = projects.map((p) => ({
        name: p.config.name,
        description: p.config.description,
        status: p.config.status,
        repos: p.config.repos,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ projects: projectList }, null, 2),
          },
        ],
      };
    }
  );

  // ─── Start server ───────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
