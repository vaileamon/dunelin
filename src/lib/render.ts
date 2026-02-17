import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { TemplateFile } from "../templates/embedded.ts";

export interface TemplateVars {
  workspaceName: string;
  userName: string;
  userRole: string;
}

/**
 * Replace template placeholders in content.
 */
export function renderTemplate(content: string, vars: TemplateVars): string {
  return content
    .replace(/\{Workspace Name\}/g, vars.workspaceName)
    .replace(/\{Name\}/g, vars.userName)
    .replace(/\{Role\}/g, vars.userRole);
}

/**
 * Write embedded template files to a target directory, rendering placeholders.
 */
export async function writeEmbeddedTemplate(
  template: TemplateFile[],
  destDir: string,
  vars: TemplateVars
): Promise<void> {
  await mkdir(destDir, { recursive: true });

  for (const file of template) {
    const destPath = join(destDir, file.path);
    await mkdir(dirname(destPath), { recursive: true });

    // Render .md and .json files, copy others as-is
    const shouldRender =
      file.path.endsWith(".md") || file.path.endsWith(".json");
    const content = shouldRender
      ? renderTemplate(file.content, vars)
      : file.content;

    await writeFile(destPath, content, "utf-8");
  }
}
