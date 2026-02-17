import { readdir, readFile } from "fs/promises";
import { join } from "path";
import {
  workspaceConfigSchema,
  projectConfigSchema,
  type WorkspaceConfig,
  type ProjectConfig,
} from "./schemas.ts";

/**
 * Read and parse a dunelin.json file.
 */
export async function readDunelinJson(
  filePath: string
): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Read workspace-level dunelin.json.
 */
export async function readWorkspaceConfig(
  workspacePath: string
): Promise<WorkspaceConfig | null> {
  const raw = await readDunelinJson(join(workspacePath, "dunelin.json"));
  if (!raw) return null;
  const result = workspaceConfigSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Read a project-level dunelin.json.
 */
export async function readProjectConfig(
  projectPath: string
): Promise<ProjectConfig | null> {
  const raw = await readDunelinJson(join(projectPath, "dunelin.json"));
  if (!raw) return null;
  const result = projectConfigSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Read a text file, returning null if not found.
 */
export async function readTextFile(
  filePath: string
): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Detect if a path is a dunelin workspace (has a dunelin.json at root).
 */
export async function isWorkspace(dirPath: string): Promise<boolean> {
  const config = await readWorkspaceConfig(dirPath);
  return config !== null;
}

/**
 * List all projects in a workspace (directories under /projects that have dunelin.json).
 */
export async function listProjects(
  workspacePath: string
): Promise<{ name: string; path: string; config: ProjectConfig }[]> {
  const projectsDir = join(workspacePath, "projects");
  let entries: string[];

  try {
    const dirEntries = await readdir(projectsDir, { withFileTypes: true });
    entries = dirEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }

  const projects: { name: string; path: string; config: ProjectConfig }[] = [];

  for (const name of entries) {
    const projectPath = join(projectsDir, name);
    const config = await readProjectConfig(projectPath);
    if (config) {
      projects.push({ name, path: projectPath, config });
    }
  }

  return projects;
}

/**
 * Get the context filename for a workspace (defaults to CLAUDE.md).
 */
export async function getContextFilename(
  workspacePath: string
): Promise<string> {
  const config = await readWorkspaceConfig(workspacePath);
  return config?.contextFile ?? "CLAUDE.md";
}

/**
 * Find all projects that have repos defined in their dunelin.json.
 */
export async function listProjectsWithRepos(
  workspacePath: string
): Promise<{ projectName: string; projectPath: string; repos: import("./schemas.ts").RepoConfig[] }[]> {
  const projects = await listProjects(workspacePath);
  return projects
    .filter((p) => p.config.repos.length > 0)
    .map((p) => ({
      projectName: p.name,
      projectPath: p.path,
      repos: p.config.repos,
    }));
}
