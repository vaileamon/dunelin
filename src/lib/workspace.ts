import { readdir, readFile, cp, mkdir } from "fs/promises";
import { join, relative, dirname } from "path";
import { existsSync } from "fs";
import picomatch from "picomatch";
import {
  workspaceConfigSchema,
  projectConfigSchema,
  type WorkspaceConfig,
  type ProjectConfig,
} from "./schemas.ts";

// ─── Constants ─────────────────────────────────────────────────────────────────

export const DUNELIN_DIR = ".dunelin";
export const SHADOW_DIR = ".dunelin/shadow";
export const CONFIG_FILE = ".dunelin/config.json";
export const LEGACY_CONFIG_FILE = "dunelin.json";

// ─── Config reading ────────────────────────────────────────────────────────────

/**
 * Read and parse a JSON file.
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
 * Read workspace config. Tries .dunelin/config.json first, falls back to root dunelin.json.
 */
export async function readWorkspaceConfig(
  workspacePath: string
): Promise<WorkspaceConfig | null> {
  // Try new location first
  let raw = await readDunelinJson(join(workspacePath, CONFIG_FILE));

  // Fall back to legacy location
  if (!raw) {
    raw = await readDunelinJson(join(workspacePath, LEGACY_CONFIG_FILE));
  }

  if (!raw) return null;
  const result = workspaceConfigSchema.safeParse(raw);
  return result.success ? result.data : null;
}

// ─── Shadow helpers ────────────────────────────────────────────────────────────

/**
 * Get the shadow directory path for a workspace.
 */
export function getShadowPath(workspacePath: string): string {
  return join(workspacePath, SHADOW_DIR);
}

/**
 * Check if a workspace has a shadow repo.
 */
export function hasShadow(workspacePath: string): boolean {
  return existsSync(join(workspacePath, SHADOW_DIR, ".git"));
}

/**
 * Recursively walk a directory and return all file paths (relative to root).
 * Skips .git directories during traversal for performance.
 */
async function walkDir(dir: string, root?: string): Promise<string[]> {
  root = root ?? dir;
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git") continue; // skip .git dir entirely
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, root)));
    } else {
      files.push(relative(root, fullPath));
    }
  }

  return files;
}

/**
 * Copy files from shadow to workspace root.
 * .git/ is skipped at walk time. Applies updateIgnore glob patterns.
 * If `onlyFiles` is provided, only those relative paths are copied.
 */
export async function copyFromShadow(
  shadowPath: string,
  targetPath: string,
  ignorePatterns: string[] = ["**/repos"],
  onlyFiles?: string[]
): Promise<{ copied: string[]; skipped: string[] }> {
  const allFiles = await walkDir(shadowPath);
  const isIgnored = picomatch(ignorePatterns);
  const fileSet = onlyFiles ? new Set(onlyFiles) : null;

  const copied: string[] = [];
  const skipped: string[] = [];

  for (const relPath of allFiles) {
    if (isIgnored(relPath)) {
      skipped.push(relPath);
      continue;
    }

    if (fileSet && !fileSet.has(relPath)) {
      skipped.push(relPath);
      continue;
    }

    const srcFile = join(shadowPath, relPath);
    const destFile = join(targetPath, relPath);

    await mkdir(dirname(destFile), { recursive: true });
    await cp(srcFile, destFile);
    copied.push(relPath);
  }

  return { copied, skipped };
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
 * Detect if a path is a dunelin workspace.
 * Checks for .dunelin/config.json (new) or dunelin.json (legacy).
 */
export async function isWorkspace(dirPath: string): Promise<boolean> {
  if (existsSync(join(dirPath, CONFIG_FILE))) return true;
  if (existsSync(join(dirPath, LEGACY_CONFIG_FILE))) return true;
  return false;
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
