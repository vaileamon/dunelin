import * as p from "@clack/prompts";
import { readFile, readdir } from "fs/promises";
import { join, relative } from "path";
import picomatch from "picomatch";
import simpleGit from "simple-git";
import {
  readWorkspaceConfig,
  hasShadow,
  getShadowPath,
  getContextFilename,
  copyFromShadow,
} from "../lib/workspace.ts";
import { injectDunelinBlock } from "../lib/block.ts";

export async function runUpdate(): Promise<void> {
  const workspacePath = process.cwd();

  p.intro("Dunelin Update");

  // Check config
  const config = await readWorkspaceConfig(workspacePath);
  if (!config) {
    p.log.error("Not a Dunelin workspace. Run `dunelin init` first.");
    process.exit(1);
  }

  // Shadow workflow: pull + copy
  if (config.shadow && hasShadow(workspacePath)) {
    await pullAndApply(workspacePath, config);
  }

  // Always refresh the dunelin block (matches current binary version)
  const contextFile = await getContextFilename(workspacePath);
  const injected = await injectDunelinBlock(join(workspacePath, contextFile), config);
  if (injected) {
    p.log.success("Dunelin block updated.");
  }

  p.outro("Done.");
}

// ─── Shadow pull + apply ────────────────────────────────────────────────────

async function pullAndApply(
  workspacePath: string,
  config: { updateIgnore?: string[] }
): Promise<void> {
  const shadowPath = getShadowPath(workspacePath);

  const s = p.spinner();
  s.start("Pulling latest context...");

  try {
    const git = simpleGit(shadowPath);
    await git.pull();
  } catch (err) {
    s.stop("Failed to pull.");
    p.log.error(
      `Git pull failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }

  s.stop("Pulled latest changes.");

  const ignorePatterns = config.updateIgnore ?? ["**/repos"];
  const changes = await diffShadowVsWorkspace(shadowPath, workspacePath, ignorePatterns);

  if (changes.length === 0) {
    p.log.info("Context files are up to date with shadow.");
    return;
  }

  p.log.info(`Found ${changes.length} change${changes.length > 1 ? "s" : ""}:`);
  for (const change of changes) {
    const icon = change.type === "added" ? "+" : "~";
    p.log.message(`  ${icon} ${change.path} (${change.type})`);
  }

  const applyChoice = await p.select({
    message: "Apply changes?",
    options: [
      { value: "all" as const, label: "Apply all" },
      { value: "pick" as const, label: "Let me pick" },
      { value: "skip" as const, label: "Skip" },
    ],
  });

  if (p.isCancel(applyChoice) || applyChoice === "skip") {
    p.log.info("File changes skipped.");
    return;
  }

  let filesToApply = changes.map((c) => c.path);

  if (applyChoice === "pick") {
    const selected = await p.multiselect({
      message: "Which files to apply?",
      options: changes.map((c) => ({
        value: c.path,
        label: `${c.path} (${c.type})`,
      })),
      required: false,
    });

    if (p.isCancel(selected) || (selected as string[]).length === 0) {
      p.log.info("File changes skipped.");
      return;
    }

    filesToApply = selected as string[];
  }

  const s2 = p.spinner();
  s2.start("Applying changes...");

  const { copied } = await copyFromShadow(
    getShadowPath(workspacePath),
    workspacePath,
    ignorePatterns,
    filesToApply
  );

  s2.stop(`Applied ${copied.length} file${copied.length > 1 ? "s" : ""}.`);
}

// ─── Diff logic ─────────────────────────────────────────────────────────────

interface FileChange {
  path: string;
  type: "added" | "modified";
}

async function diffShadowVsWorkspace(
  shadowPath: string,
  workspacePath: string,
  ignorePatterns: string[]
): Promise<FileChange[]> {
  const isIgnored = picomatch(ignorePatterns);
  const changes: FileChange[] = [];

  async function walk(dir: string, root: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath);

      if (isIgnored(relPath)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath, root);
      } else {
        const workspaceFile = join(workspacePath, relPath);

        try {
          const shadowContent = await readFile(fullPath, "utf-8");
          const workspaceContent = await readFile(workspaceFile, "utf-8");

          if (shadowContent !== workspaceContent) {
            changes.push({ path: relPath, type: "modified" });
          }
        } catch {
          changes.push({ path: relPath, type: "added" });
        }
      }
    }
  }

  await walk(shadowPath, shadowPath);
  return changes;
}
