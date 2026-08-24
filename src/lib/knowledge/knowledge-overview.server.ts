import "server-only";

import { asc, eq } from "drizzle-orm";
import { databaseAdapter } from "@/lib/db";
import {
  pgKnowledgeBase,
  pgPrompts,
  pgPromptVersions,
  pgProjects,
} from "@/lib/db/postgres-schema";
import {
  knowledgeBase,
  prompts,
  promptVersions,
  projects,
} from "@/lib/db/schema";

export async function getKnowledgeOverview(workspaceId: string) {
  const knowledge =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            id: pgKnowledgeBase.id,
            projectName: pgProjects.name,
            title: pgKnowledgeBase.title,
            type: pgKnowledgeBase.type,
            content: pgKnowledgeBase.content,
          })
          .from(pgKnowledgeBase)
          .innerJoin(pgProjects, eq(pgProjects.id, pgKnowledgeBase.projectId))
          .where(eq(pgProjects.workspaceId, workspaceId))
          .orderBy(asc(pgKnowledgeBase.title))
      : await databaseAdapter.db
          .select({
            id: knowledgeBase.id,
            projectName: projects.name,
            title: knowledgeBase.title,
            type: knowledgeBase.type,
            content: knowledgeBase.content,
          })
          .from(knowledgeBase)
          .innerJoin(projects, eq(projects.id, knowledgeBase.projectId))
          .where(eq(projects.workspaceId, workspaceId))
          .orderBy(asc(knowledgeBase.title));
  const promptRows =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            id: pgPrompts.id,
            projectName: pgProjects.name,
            name: pgPrompts.name,
            description: pgPrompts.description,
            variables: pgPrompts.variables,
            currentVersion: pgPrompts.currentVersion,
            content: pgPromptVersions.content,
          })
          .from(pgPrompts)
          .innerJoin(pgProjects, eq(pgProjects.id, pgPrompts.projectId))
          .innerJoin(
            pgPromptVersions,
            eq(pgPromptVersions.promptId, pgPrompts.id),
          )
          .where(eq(pgProjects.workspaceId, workspaceId))
          .orderBy(asc(pgPrompts.name))
      : await databaseAdapter.db
          .select({
            id: prompts.id,
            projectName: projects.name,
            name: prompts.name,
            description: prompts.description,
            variables: prompts.variables,
            currentVersion: prompts.currentVersion,
            content: promptVersions.content,
          })
          .from(prompts)
          .innerJoin(projects, eq(projects.id, prompts.projectId))
          .innerJoin(promptVersions, eq(promptVersions.promptId, prompts.id))
          .where(eq(projects.workspaceId, workspaceId))
          .orderBy(asc(prompts.name));
  return { knowledge, prompts: promptRows };
}
