import { z } from "zod";

export const repoSchema = z.object({
  name: z.string(),
  url: z.string().url().or(z.string().startsWith("git@")),
});

export const projectConfigSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  status: z.string().default("active"),
  repos: z.array(repoSchema).default([]),
  tags: z.array(z.string()).default([]),
});

export const workspaceConfigSchema = z.object({
  version: z.string().default("1.0.0"),
  contextFile: z.string().default("CLAUDE.md"),
  template: z.string().nullable().default(null),
  templateUrl: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RepoConfig = z.infer<typeof repoSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;
