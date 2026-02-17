import * as p from "@clack/prompts";
import { resolve, basename, join } from "path";
import { writeFile, rename, readdir } from "fs/promises";
import { existsSync } from "fs";
import { cloneTemplate, cloneProjectRepos } from "../lib/git.ts";
import { writeEmbeddedTemplate, type TemplateVars } from "../lib/render.ts";
import { listProjectsWithRepos } from "../lib/workspace.ts";
import { BASE_TEMPLATE } from "../templates/embedded.ts";

export async function runInit(args: string[]): Promise<void> {
  const targetName = args[0]; // optional: dunelin init my-workspace

  p.intro("Welcome to Dunelin.");

  const setupType = await p.select({
    message: "How do you want to set up your workspace?",
    options: [
      {
        value: "git" as const,
        label: "Use a git template",
        hint: "paste a git URL",
      },
      {
        value: "builtin" as const,
        label: "Pick a built-in template",
      },
    ],
  });

  if (p.isCancel(setupType)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (setupType === "git") {
    await initFromGit(targetName);
  } else {
    await initFromBuiltin(targetName);
  }
}

// ─── Git Template Path ──────────────────────────────────────────────────────

async function initFromGit(targetName: string | undefined): Promise<void> {
  const templateUrl = await p.text({
    message: "Template URL:",
    placeholder: "git@github.com:company/workspace-template.git",
    validate: (v) => {
      if (!v.trim()) return "URL is required";
      if (!v.includes("git") && !v.startsWith("http"))
        return "Must be a git URL";
    },
  });

  if (p.isCancel(templateUrl)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // Determine target directory
  const targetDir = resolveTargetDir(targetName);

  const s = p.spinner();
  s.start(targetName ? `Cloning template into ${targetName}...` : "Cloning template...");

  try {
    await cloneTemplate(templateUrl, targetDir);
  } catch (err) {
    s.stop("Failed to clone template.");
    p.log.error(
      `Git clone failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }

  s.stop("Template cloned.");

  // Update dunelin.json with template source (only if template includes one)
  const hasConfig = existsSync(join(targetDir, "dunelin.json"));
  if (hasConfig) {
    await updateWorkspaceConfig(targetDir, {
      template: "custom",
      templateUrl,
    });
  } else {
    p.log.warn("No dunelin.json found in template — skipping workspace config.");
  }

  // Smart repo detection
  await offerRepoCloning(targetDir);

  p.outro(targetName ? `Workspace ready at ./${targetName}` : "Workspace ready.");
  printNextSteps(targetDir, targetName);
}

// ─── Built-in Template Path ─────────────────────────────────────────────────

async function initFromBuiltin(
  targetName: string | undefined
): Promise<void> {
  const template = await p.select({
    message: "Pick a template:",
    options: [
      {
        value: "base" as const,
        label: "Base",
        hint: "recommended — standard agentic workspace",
      },
    ],
  });

  if (p.isCancel(template)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const userName = await p.text({
    message: "Your name:",
    placeholder: "Antoine Ghigny",
    validate: (v) => {
      if (!v.trim()) return "Name is required";
    },
  });

  if (p.isCancel(userName)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const userRole = await p.text({
    message: "Your role:",
    placeholder: "Founder/CEO",
    validate: (v) => {
      if (!v.trim()) return "Role is required";
    },
  });

  if (p.isCancel(userRole)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const contextFile = await p.select({
    message: "Which AI tool do you primarily use?",
    options: [
      { value: "CLAUDE.md", label: "Claude Code", hint: "generates CLAUDE.md" },
      {
        value: ".cursorrules",
        label: "Cursor",
        hint: "generates .cursorrules",
      },
      { value: "custom", label: "Other", hint: "choose your own filename" },
    ],
  });

  if (p.isCancel(contextFile)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  let finalContextFile: string = contextFile;
  if (contextFile === "custom") {
    const custom = await p.text({
      message: "Context filename:",
      placeholder: "AGENTS.md",
      validate: (v) => {
        if (!v.trim()) return "Filename is required";
      },
    });
    if (p.isCancel(custom)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
    finalContextFile = custom;
  }

  // Determine target directory
  const workspaceName = targetName || basename(process.cwd());
  const targetDir = targetName
    ? resolve(process.cwd(), targetName)
    : process.cwd();

  const s = p.spinner();
  s.start("Scaffolding workspace...");

  const vars: TemplateVars = {
    workspaceName,
    userName,
    userRole,
  };

  // Write embedded template files
  await writeEmbeddedTemplate(BASE_TEMPLATE, targetDir, vars);

  // Rename CLAUDE.md to the chosen context filename if different
  if (finalContextFile !== "CLAUDE.md") {
    await renameContextFiles(targetDir, finalContextFile);
  }

  // Update dunelin.json with actual values
  const now = new Date().toISOString();
  await updateWorkspaceConfig(targetDir, {
    contextFile: finalContextFile,
    template: "base",
    createdAt: now,
    updatedAt: now,
  });

  s.stop("Workspace scaffolded.");

  p.outro(targetName ? `Workspace ready at ./${targetName}` : "Workspace ready.");
  printNextSteps(targetDir, targetName);
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function resolveTargetDir(targetName: string | undefined): string {
  if (targetName) {
    return resolve(process.cwd(), targetName);
  }
  return process.cwd();
}

async function updateWorkspaceConfig(
  workspacePath: string,
  updates: Record<string, unknown>
): Promise<void> {
  const configPath = join(workspacePath, "dunelin.json");
  let config: Record<string, unknown> = {};

  try {
    const raw = await Bun.file(configPath).text();
    config = JSON.parse(raw);
  } catch {
    // Start fresh
  }

  const now = new Date().toISOString();
  config = {
    ...config,
    ...updates,
    updatedAt: now,
  };

  // Ensure createdAt is set
  if (!config.createdAt) {
    config.createdAt = now;
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

async function renameContextFiles(
  workspacePath: string,
  newName: string
): Promise<void> {
  // Rename root context file
  const rootOld = join(workspacePath, "CLAUDE.md");
  const rootNew = join(workspacePath, newName);
  if (existsSync(rootOld)) {
    await rename(rootOld, rootNew);
  }

  // Rename in all project directories
  const projectsDir = join(workspacePath, "projects");
  try {
    const entries = await readdir(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projOld = join(projectsDir, entry.name, "CLAUDE.md");
        const projNew = join(projectsDir, entry.name, newName);
        if (existsSync(projOld)) {
          await rename(projOld, projNew);
        }
      }
    }
  } catch {
    // projects dir might not exist yet
  }
}

async function offerRepoCloning(workspacePath: string): Promise<void> {
  const projectRepos = await listProjectsWithRepos(workspacePath);

  if (projectRepos.length === 0) return;

  p.log.info("Found repos in project metadata:");
  for (const pr of projectRepos) {
    const repoNames = pr.repos.map((r) => r.name).join(", ");
    p.log.message(
      `  ${pr.projectName}: ${pr.repos.length} repo${pr.repos.length > 1 ? "s" : ""} (${repoNames})`
    );
  }

  const cloneChoice = await p.select({
    message: "Clone project repos?",
    options: [
      { value: "all" as const, label: "Yes, clone all" },
      { value: "pick" as const, label: "Let me pick which ones" },
      { value: "skip" as const, label: "Skip for now" },
    ],
  });

  if (p.isCancel(cloneChoice) || cloneChoice === "skip") return;

  let reposToClone = projectRepos;

  if (cloneChoice === "pick") {
    const choices = projectRepos.map((pr) => ({
      value: pr.projectName,
      label: `${pr.projectName} (${pr.repos.length} repo${pr.repos.length > 1 ? "s" : ""})`,
    }));

    const selected = await p.multiselect({
      message: "Which projects' repos to clone?",
      options: choices,
      required: false,
    });

    if (p.isCancel(selected)) return;
    reposToClone = projectRepos.filter((pr) =>
      (selected as string[]).includes(pr.projectName)
    );
  }

  if (reposToClone.length === 0) return;

  const s = p.spinner();
  s.start("Cloning repos...");

  for (const pr of reposToClone) {
    const results = await cloneProjectRepos(pr.projectPath, pr.repos);
    for (const result of results) {
      if (result.success) {
        p.log.success(`  ${pr.projectName}/${result.name}`);
      } else {
        p.log.error(
          `  ${pr.projectName}/${result.name}: ${result.error}`
        );
      }
    }
  }

  s.stop("Repos cloned.");
}

function printNextSteps(targetDir: string, targetName: string | undefined): void {
  const cdStep = targetName ? `    cd ${targetName}\n` : "";
  console.log(`
  Next steps:
${cdStep}    Open in your editor — your AI tool will read the context automatically.
    To add projects, create folders under projects/ or use a git template.
`);
}
