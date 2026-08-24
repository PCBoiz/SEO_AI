import { z } from "zod";
import { ValidationError } from "@/domain/shared/app-error";

const httpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .refine(isHttpUrl, "Phải là URL HTTP hoặc HTTPS hợp lệ.")
  .transform(normalizeHttpUrl);

const competitorSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Tên miền đối thủ là bắt buộc.")
    .max(253)
    .refine(isDomain, "Tên miền không hợp lệ.")
    .transform(normalizeDomain),
  title: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  priority: z.number().int().min(0).max(5).default(0),
});

const wordpressSchema = z.object({
  url: httpUrlSchema,
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(512),
});

const editableWordpressSchema = z.object({
  url: httpUrlSchema,
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(512).optional(),
});

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    website: httpUrlSchema,
    location: z.string().trim().max(100).optional(),
    industry: z.string().trim().max(100).optional(),
    language: z.string().trim().min(1).max(50),
    tone: z.string().trim().min(1).max(50),
    competitors: z.array(competitorSchema).max(10).default([]),
    wordpress: wordpressSchema.optional(),
  })
  .superRefine((input, context) => {
    const domains = new Set<string>();
    input.competitors.forEach((competitor, index) => {
      if (domains.has(competitor.domain)) {
        context.addIssue({
          code: "custom",
          path: ["competitors", index, "domain"],
          message: "Tên miền đối thủ không được trùng nhau.",
        });
      }
      domains.add(competitor.domain);
    });
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    website: httpUrlSchema,
    location: z.string().trim().max(100).optional(),
    industry: z.string().trim().max(100).optional(),
    language: z.string().trim().min(1).max(50),
    tone: z.string().trim().min(1).max(50),
    competitors: z.array(competitorSchema).max(10),
    wordpress: z.union([editableWordpressSchema, z.null()]).optional(),
  })
  .superRefine((input, context) => {
    const domains = new Set<string>();
    input.competitors.forEach((competitor, index) => {
      if (domains.has(competitor.domain)) {
        context.addIssue({
          code: "custom",
          path: ["competitors", index, "domain"],
          message: "Tên miền đối thủ không được trùng nhau.",
        });
      }
      domains.add(competitor.domain);
    });
  });

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export interface ProjectCompetitor {
  id: string;
  domain: string;
  title?: string;
  notes?: string;
  priority: number;
}

export interface ProjectSnapshot {
  id: string;
  workspaceId: string;
  name: string;
  website: string;
  location?: string;
  industry?: string;
  language: string;
  tone: string;
  status: "active" | "archived";
  competitors: ProjectCompetitor[];
  wordpress?: {
    url: string;
    username: string;
    password?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectAggregate {
  private constructor(private readonly state: ProjectSnapshot) {}

  static create(args: {
    id: string;
    workspaceId: string;
    input: CreateProjectInput;
    competitorIds: string[];
    now: Date;
  }): ProjectAggregate {
    const { id, workspaceId, input, competitorIds, now } = args;
    return new ProjectAggregate({
      id,
      workspaceId,
      name: input.name,
      website: input.website,
      location: emptyToUndefined(input.location),
      industry: emptyToUndefined(input.industry),
      language: input.language,
      tone: input.tone,
      status: "active",
      competitors: input.competitors.map((competitor, index) => ({
        id: competitorIds[index],
        domain: competitor.domain,
        title: emptyToUndefined(competitor.title),
        notes: emptyToUndefined(competitor.notes),
        priority: competitor.priority,
      })),
      wordpress: input.wordpress,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(snapshot: ProjectSnapshot): ProjectAggregate {
    return new ProjectAggregate(structuredClone(snapshot));
  }

  update(
    input: UpdateProjectInput,
    competitorIds: string[],
    now: Date,
  ): void {
    this.state.name = input.name;
    this.state.website = input.website;
    this.state.location = emptyToUndefined(input.location);
    this.state.industry = emptyToUndefined(input.industry);
    this.state.language = input.language;
    this.state.tone = input.tone;
    this.state.competitors = input.competitors.map((competitor, index) => ({
      id: competitorIds[index],
      domain: competitor.domain,
      title: emptyToUndefined(competitor.title),
      notes: emptyToUndefined(competitor.notes),
      priority: competitor.priority,
    }));
    if ("wordpress" in input) {
      this.state.wordpress = input.wordpress ?? undefined;
    }
    this.state.updatedAt = now;
  }

  archive(now: Date): void {
    this.state.status = "archived";
    this.state.updatedAt = now;
  }

  snapshot(): Readonly<ProjectSnapshot> {
    return structuredClone(this.state);
  }
}

export function parseCreateProjectInput(input: unknown): CreateProjectInput {
  const result = createProjectSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      "INVALID_PROJECT_PAYLOAD",
      "Thông tin dự án không hợp lệ.",
      {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    );
  }
  return result.data;
}

export function parseUpdateProjectInput(input: unknown): UpdateProjectInput {
  const result = updateProjectSchema.safeParse(input);
  if (!result.success) {
    throwProjectValidation(result.error.issues);
  }
  return result.data;
}

function throwProjectValidation(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): never {
  throw new ValidationError(
    "INVALID_PROJECT_PAYLOAD",
    "Thông tin dự án không hợp lệ.",
    {
      issues: issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function normalizeHttpUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function isDomain(value: string): boolean {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "localhost" || url.hostname.includes("."))
    );
  } catch {
    return false;
  }
}

function normalizeDomain(value: string): string {
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
