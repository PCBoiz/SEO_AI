import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

type JsonObject = Record<string, unknown>;
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const pgUsers = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

// Job store dùng chung cho mọi module app-native (Module 2 trở đi). Phân biệt
// module bằng module_key; input/output là JSON generic để engine tái sử dụng.
export const pgModuleJobs = pgTable(
  "module_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id").notNull(),
    projectId: text("project_id").notNull(),
    moduleKey: text("module_key").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status", {
      enum: [
        "queued",
        "dispatching",
        "running",
        "succeeded",
        "failed",
        "timed_out",
      ],
    })
      .notNull()
      .default("queued"),
    inputPayload: jsonb("input_payload").$type<JsonObject>().notNull(),
    outputPayload: jsonb("output_payload").$type<JsonObject>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    // Ghim: bản run được chọn làm "chính thức" — nối luồng/preset ưu tiên bản này.
    pinnedAt: timestamptz("pinned_at"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
    startedAt: timestamptz("started_at"),
    completedAt: timestamptz("completed_at"),
  },
  (table) => [
    uniqueIndex("module_jobs_workspace_module_idempotency_unique").on(
      table.workspaceId,
      table.moduleKey,
      table.idempotencyKey,
    ),
    index("module_jobs_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("module_jobs_project_id_idx").on(table.projectId),
  ],
);

export const pgUserAiKeys = pgTable(
  "user_ai_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => pgUsers.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["openai", "deepseek", "gemini", "anthropic"],
    }).notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    keyHint: text("key_hint"),
    model: text("model"),
    status: text("status", {
      enum: ["unverified", "active", "error"],
    })
      .notNull()
      .default("unverified"),
    lastVerifiedAt: timestamptz("last_verified_at"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("user_ai_keys_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    index("user_ai_keys_user_id_idx").on(table.userId),
  ],
);

export const pgSessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => pgUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    lastSeenAt: timestamptz("last_seen_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const pgAuthAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => pgUsers.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["google", "make"] }).notNull(),
    providerSubject: text("provider_subject").notNull(),
    providerEmail: text("provider_email"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
    lastLoginAt: timestamptz("last_login_at"),
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_subject_unique").on(
      table.provider,
      table.providerSubject,
    ),
    uniqueIndex("auth_accounts_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    index("auth_accounts_user_id_idx").on(table.userId),
  ],
);

export const pgWorkspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [uniqueIndex("workspaces_slug_unique").on(table.slug)],
);

export const pgWorkspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => pgWorkspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => pgUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_idx").on(table.userId),
  ],
);

export const pgOauthConnections = pgTable(
  "oauth_connections",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => pgWorkspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => pgUsers.id, { onDelete: "cascade" }),
    provider: text("provider", {
      // `github`: token cá nhân (không OAuth) để đẩy web khách lên kho — cùng
      // phạm vi (workspace, user), cùng vault. Xem `lib/dung-web/github.server.ts`.
      enum: ["google_workspace", "make", "github"],
    }).notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    providerEmail: text("provider_email"),
    displayLabel: text("display_label"),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    encryptedTokens: text("encrypted_tokens").notNull(),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    status: text("status", {
      enum: ["active", "expired", "revoked", "error"],
    })
      .notNull()
      .default("active"),
    lastVerifiedAt: timestamptz("last_verified_at"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("oauth_connections_workspace_user_provider_unique").on(
      table.workspaceId,
      table.userId,
      table.provider,
    ),
    index("oauth_connections_workspace_id_idx").on(table.workspaceId),
    index("oauth_connections_user_id_idx").on(table.userId),
  ],
);

export const pgProjects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => pgWorkspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    website: text("website").notNull(),
    location: text("location"),
    industry: text("industry"),
    language: text("language").notNull(),
    tone: text("tone").notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [index("projects_workspace_id_idx").on(table.workspaceId)],
);

export const pgCompetitors = pgTable(
  "competitors",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => pgProjects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    title: text("title"),
    notes: text("notes"),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("competitors_project_domain_unique").on(
      table.projectId,
      table.domain,
    ),
    index("competitors_project_id_idx").on(table.projectId),
  ],
);

export const pgProjectIntegrations = pgTable(
  "project_integrations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => pgProjects.id, { onDelete: "cascade" }),
    // Phải khớp với danh sách trong `schema.ts` (bản SQLite). Lệch nhau thì
    // chạy ở máy được mà lên Neon hỏng, hoặc ngược lại — kiểu sai chỉ lộ ra ở
    // đúng môi trường mình không thử.
    //
    // Thêm kiểu ở đây KHÔNG cần migration: `enum` chỉ ở tầng TypeScript, SQL
    // sinh ra là `text NOT NULL` trơn, không có ràng buộc CHECK.
    type: text("type", {
      enum: [
        "wordpress",
        "google_sheet_bridge",
        "facebook",
        "zalo",
        "google_business",
        "custom_site",
        // Bảng Google Sheets nhận khách liên hệ từ website (11/09).
        "lead_sheet",
        // Thư mục Google Drive chứa ảnh của dự án (11/09). Không có bí mật —
        // config giữ folderId và userId của người có token đọc được thư mục.
        "drive_folder",
        // Lịch đăng bài tự động (12/09). Config giữ lịch + chủ đề + tiến độ các
        // lượt; bí mật là mã kích hoạt để VPS gõ nhịp.
        "lich_dang",
        // Kho GitHub chứa mã web khách (13/09). Không có bí mật — token nằm ở
        // `oauth_connections` của người dùng; config giữ owner/repo/commit.
        "github_web",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["configured", "unconfigured", "disabled", "error"],
    })
      .notNull()
      .default("unconfigured"),
    config: jsonb("config").$type<JsonObject>(),
    encryptedCredentials: text("encrypted_credentials"),
    secretReference: text("secret_reference"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("project_integrations_project_type_unique").on(
      table.projectId,
      table.type,
    ),
  ],
);

export const pgCapabilities = pgTable(
  "capabilities",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [uniqueIndex("capabilities_key_unique").on(table.key)],
);

export const pgAutomationRegistry = pgTable(
  "automation_registry",
  {
    id: text("id").primaryKey(),
    capabilityId: text("capability_id")
      .notNull()
      .references(() => pgCapabilities.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon").notNull(),
    provider: text("provider", {
      enum: ["mock", "make", "local", "n8n", "temporal", "ai_agent"],
    }).notNull(),
    providerKey: text("provider_key").notNull(),
    completionMode: text("completion_mode", {
      enum: ["polling", "callback", "callback_with_polling_fallback"],
    }).notNull(),
    category: text("category").notNull(),
    inputSchema: jsonb("inputs_schema").$type<JsonObject>().notNull(),
    outputSchema: jsonb("outputs_schema").$type<JsonObject>().notNull(),
    timeoutSeconds: integer("timeout").notNull().default(600),
    maxRetries: integer("retry").notNull().default(3),
    estimatedDurationSeconds: integer("estimated_duration"),
    estimatedCost: integer("cost"),
    executionMode: text("execution_mode", { enum: ["async", "sync"] })
      .notNull()
      .default("async"),
    status: text("status", { enum: ["enabled", "disabled"] }).notNull(),
    version: integer("version").notNull().default(1),
    tags: jsonb("tags").$type<string[]>().notNull(),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("automation_registry_provider_key_unique").on(
      table.providerKey,
    ),
    index("automation_registry_capability_id_idx").on(table.capabilityId),
  ],
);

export const pgPipelines = pgTable(
  "pipelines",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => pgProjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [index("pipelines_project_id_idx").on(table.projectId)],
);

export const pgPipelineNodes = pgTable(
  "pipeline_nodes",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pgPipelines.id, { onDelete: "cascade" }),
    automationId: text("automation_id")
      .notNull()
      .references(() => pgAutomationRegistry.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    positionX: doublePrecision("position_x").notNull(),
    positionY: doublePrecision("position_y").notNull(),
    config: jsonb("config").$type<JsonObject>(),
  },
  (table) => [index("pipeline_nodes_pipeline_id_idx").on(table.pipelineId)],
);

export const pgPipelineEdges = pgTable(
  "pipeline_edges",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pgPipelines.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    target: text("target").notNull(),
  },
  (table) => [
    uniqueIndex("pipeline_edges_connection_unique").on(
      table.pipelineId,
      table.source,
      table.target,
    ),
    index("pipeline_edges_pipeline_id_idx").on(table.pipelineId),
  ],
);

export const pgContentOutputs = pgTable("content_outputs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => pgProjects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  status: text("status", {
    enum: ["draft", "published", "archived", "regenerated"],
  }).notNull(),
  currentRevision: integer("latest_version").notNull().default(1),
  wordpressPostId: integer("wordpress_post_id"),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
});

export const pgAssets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => pgProjects.id, { onDelete: "cascade" }),
    outputId: text("output_id").references(() => pgContentOutputs.id, {
      onDelete: "set null",
    }),
    storageProvider: text("storage_provider", {
      enum: ["local", "vercel_blob", "r2", "s3"],
    }).notNull(),
    bucket: text("bucket").notNull(),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes"),
    checksum: text("checksum"),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("assets_storage_key_unique").on(
      table.storageProvider,
      table.bucket,
      table.storageKey,
    ),
  ],
);

export const pgKnowledgeBase = pgTable(
  "knowledge_base",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => pgProjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type", { enum: ["text", "url", "asset"] }).notNull(),
    content: text("content"),
    assetId: text("asset_id").references(() => pgAssets.id, {
      onDelete: "set null",
    }),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [index("knowledge_base_project_id_idx").on(table.projectId)],
);

export const pgPrompts = pgTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => pgProjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    variables: jsonb("variables").$type<string[]>().notNull(),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [index("prompts_project_id_idx").on(table.projectId)],
);

export const pgPromptVersions = pgTable(
  "prompt_versions",
  {
    id: text("id").primaryKey(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => pgPrompts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    createdBy: text("created_by").references(() => pgUsers.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("prompt_versions_prompt_version_unique").on(
      table.promptId,
      table.version,
    ),
  ],
);

export const pgAiTestRuns = pgTable(
  "ai_test_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => pgWorkspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => pgUsers.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    provider: text("provider", {
      enum: ["openai", "deepseek", "gemini", "anthropic"],
    }).notNull(),
    model: text("model").notNull(),
    promptHash: text("prompt_hash").notNull(),
    status: text("status", {
      enum: ["running", "succeeded", "failed"],
    }).notNull(),
    encryptedResult: text("encrypted_result"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    durationMs: integer("duration_ms"),
    errorCode: text("error_code"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ai_test_runs_workspace_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("ai_test_runs_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
  ],
);

export const pgAuditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => pgWorkspaces.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => pgUsers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    details: jsonb("details").$type<JsonObject>(),
    timestamp: timestamptz("timestamp").notNull(),
  },
  (table) => [
    index("audit_logs_workspace_timestamp_idx").on(
      table.workspaceId,
      table.timestamp,
    ),
  ],
);
