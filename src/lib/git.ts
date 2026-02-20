import simpleGit from "simple-git";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import type { RepoConfig } from "./schemas.ts";
import { SHADOW_DIR } from "./workspace.ts";

/**
 * Clone a git repository to a target directory.
 */
export async function cloneRepo(
  url: string,
  targetDir: string
): Promise<void> {
  const git = simpleGit();
  await git.clone(url, targetDir);
}

/**
 * Clone a template repository, then remove its .git directory.
 * @deprecated Use cloneShadow() instead for 0.2.0+
 */
export async function cloneTemplate(
  templateUrl: string,
  targetDir: string
): Promise<void> {
  await cloneRepo(templateUrl, targetDir);
  await rm(join(targetDir, ".git"), { recursive: true, force: true });
}

/**
 * Clone a template into .dunelin/shadow/, keeping .git intact.
 * Returns the shadow directory path.
 */
export async function cloneShadow(
  templateUrl: string,
  workspacePath: string
): Promise<string> {
  const shadowPath = join(workspacePath, SHADOW_DIR);
  await mkdir(join(workspacePath, ".dunelin"), { recursive: true });
  await cloneRepo(templateUrl, shadowPath);
  return shadowPath;
}

/**
 * Clone project repos into projects/{name}/repos/ based on dunelin.json metadata.
 */
export async function cloneProjectRepos(
  projectPath: string,
  repos: RepoConfig[]
): Promise<{ name: string; success: boolean; error?: string }[]> {
  const reposDir = join(projectPath, "repos");
  await mkdir(reposDir, { recursive: true });

  const results: { name: string; success: boolean; error?: string }[] = [];

  for (const repo of repos) {
    const targetDir = join(reposDir, repo.name);
    try {
      await cloneRepo(repo.url, targetDir);
      results.push({ name: repo.name, success: true });
    } catch (err) {
      results.push({
        name: repo.name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
