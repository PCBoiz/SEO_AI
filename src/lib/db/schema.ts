import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

type JsonObject = Record<string, unknown>;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["google", "make"] }).notNull(),
    providerSubject: text("provider_subject").notNull(),
    providerEmail: text("provider_email"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
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

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("workspaces_slug_unique").on(table.slug)],
);

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_idx").on(table.userId),
  ],
);

export const oauthConnections = sqliteTable(
  "oauth_connections",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["google_workspace", "make"],
    }).notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    providerEmail: text("provider_email"),
    displayLabel: text("display_label"),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
    encryptedTokens: text("encrypted_tokens").notNull(),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    status: text("status", {
      enum: ["active", "expired", "revoked", "error"],
    })
      .notNull()
      .default("active"),
    lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
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

// Job store dùng chung cho mọi module app-native (Module 2 trở đi). Khác với
// bảng bridge sitemap_jobs (schema antigravity_bridge, khoá cứng RIS_SITEMAP cho
// Make), bảng này thuộc schema app, phân biệt module bằng module_key và lưu
// input/output dạng JSON generic để engine tái sử dụng cho tất cả module.
export const moduleJobs = sqliteTable(
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
    inputPayload: text("input_payload", { mode: "json" })
      .$type<JsonObject>()
      .notNull(),
    outputPayload: text("output_payload", { mode: "json" }).$type<JsonObject>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    // Ghim: bản run được người dùng chọn làm "chính thức" cho dự án — nối luồng
    // và preset ưu tiên bản này thay vì bản mới nhất.
    pinnedAt: integer("pinned_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
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

export const userAiKeys = sqliteTable(
  "user_ai_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("user_ai_keys_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    index("user_ai_keys_user_id_idx").on(table.userId),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    website: text("website").notNull(),
    location: text("location"),
    industry: text("industry"),
    language: text("language").notNull(),
    tone: text("tone").notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("projects_workspace_id_idx").on(table.workspaceId)],
);

export const competitors = sqliteTable(
  "competitors",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    title: text("title"),
    notes: text("notes"),
    priority: integer("priority").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("competitors_project_domain_unique").on(
      table.projectId,
      table.domain,
    ),
    index("competitors_project_id_idx").on(table.projectId),
  ],
);

export const projectIntegrations = sqliteTable(
  "project_integrations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // THÊM MỘT KIỂU Ở ĐÂY KHÔNG CẦN MIGRATION.
    //
    // `enum` của Drizzle trên cột `text` chỉ tồn tại trong TypeScript — SQL sinh
    // ra là `text NOT NULL` trơn, không có ràng buộc CHECK. Kiểm được bằng cách
    // đọc file migration đã sinh.
    //
    // Đáng ghi lại vì niềm tin ngược đã từng đẩy một quyết định thiết kế sai:
    // `vinhomes-site-environment.ts` chọn dùng biến môi trường thay vì tích hợp
    // theo dự án, với lý do "thêm kiểu tích hợp mới sẽ kéo theo đổi lược đồ cơ
    // sở dữ liệu và một lần migration trên Neon — cái giá quá lớn". Cái giá đó
    // không tồn tại, và cách thay thế hoá ra đắt hơn: mỗi lần thêm một trang là
    // một lần sửa biến môi trường rồi triển khai lại toàn hệ thống.
    type: text("type", {
      enum: [
        "wordpress",
        "google_sheet_bridge",
        "facebook",
        "zalo",
        "google_business",
        // Trang tự code nhận bài qua một cổng HTTP có khoá (ví dụ
        // `/api/ingest`). Cấu hình: `siteUrl`; bí mật: khoá đăng bài.
        "custom_site",
        // Bảng Google Sheets nhận khách liên hệ từ website (11/09).
        "lead_sheet",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["configured", "unconfigured", "disabled", "error"],
    })
      .notNull()
      .default("unconfigured"),
    config: text("config", { mode: "json" }).$type<JsonObject>(),
    encryptedCredentials: text("encrypted_credentials"),
    secretReference: text("secret_reference"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("project_integrations_project_type_unique").on(
      table.projectId,
      table.type,
    ),
  ],
);

export const capabilities = sqliteTable(
  "capabilities",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("capabilities_key_unique").on(table.key)],
);

export const automationRegistry = sqliteTable(
  "automation_registry",
  {
    id: text("id").primaryKey(),
    capabilityId: text("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "restrict" }),
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
    inputSchema: text("inputs_schema", { mode: "json" })
      .$type<JsonObject>()
      .notNull(),
    outputSchema: text("outputs_schema", { mode: "json" })
      .$type<JsonObject>()
      .notNull(),
    timeoutSeconds: integer("timeout").notNull().default(600),
    maxRetries: integer("retry").notNull().default(3),
    estimatedDurationSeconds: integer("estimated_duration"),
    estimatedCost: integer("cost"),
    executionMode: text("execution_mode", {
      enum: ["async", "sync"],
    })
      .notNull()
      .default("async"),
    status: text("status", { enum: ["enabled", "disabled"] }).notNull(),
    version: integer("version").notNull().default(1),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("automation_registry_provider_key_unique").on(
      table.providerKey,
    ),
    index("automation_registry_capability_id_idx").on(table.capabilityId),
  ],
);

export const pipelines = sqliteTable(
  "pipelines",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("pipelines_project_id_idx").on(table.projectId)],
);

export const pipelineNodes = sqliteTable(
  "pipeline_nodes",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    automationId: text("automation_id")
      .notNull()
      .references(() => automationRegistry.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    positionX: real("position_x").notNull(),
    positionY: real("position_y").notNull(),
    config: text("config", { mode: "json" }).$type<JsonObject>(),
  },
  (table) => [index("pipeline_nodes_pipeline_id_idx").on(table.pipelineId)],
);

export const pipelineEdges = sqliteTable(
  "pipeline_edges",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
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

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "restrict" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    status: text("publish_status", {
      enum: [
        "queued",
        "preparing",
        "running",
        "waiting_callback",
        "retrying",
        "completed",
        "failed",
        "cancelled",
        "timed_out",
      ],
    }).notNull(),
    progress: integer("progress").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("jobs_pipeline_id_idx").on(table.pipelineId),
    index("jobs_project_id_idx").on(table.projectId),
    index("jobs_status_idx").on(table.status),
  ],
);

export const sitemapPilotJobs = sqliteTable(
  "sitemap_pilot_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    automationKey: text("automation_key", { enum: ["RIS_SITEMAP"] })
      .notNull()
      .default("RIS_SITEMAP"),
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
    }).notNull(),
    inputPayload: text("input_payload", { mode: "json" })
      .$type<JsonObject>()
      .notNull(),
    outputPayload: text("output_payload", { mode: "json" }).$type<JsonObject>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("sitemap_pilot_jobs_workspace_idempotency_unique").on(
      table.workspaceId,
      table.automationKey,
      table.idempotencyKey,
    ),
    index("sitemap_pilot_jobs_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("sitemap_pilot_jobs_project_id_idx").on(table.projectId),
  ],
);

export const jobNodeStatuses = sqliteTable(
  "job_node_statuses",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    automationId: text("automation_id")
      .notNull()
      .references(() => automationRegistry.id, { onDelete: "restrict" }),
    status: text("status", {
      enum: [
        "pending",
        "ready",
        "running",
        "retrying",
        "completed",
        "failed",
        "timed_out",
        "skipped",
      ],
    }).notNull(),
    attempt: integer("attempt").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    durationSeconds: integer("duration_seconds"),
    tokensUsed: integer("tokens_used"),
    inputData: text("input_data", { mode: "json" }).$type<JsonObject>(),
    outputData: text("output_data", { mode: "json" }).$type<JsonObject>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => [
    uniqueIndex("job_node_statuses_job_node_unique").on(
      table.jobId,
      table.nodeId,
    ),
    index("job_node_statuses_job_id_idx").on(table.jobId),
  ],
);

export const jobLogs = sqliteTable(
  "job_logs",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    nodeId: text("node_id"),
    eventId: text("event_id"),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    level: text("level", { enum: ["debug", "info", "warn", "error"] })
      .notNull(),
    message: text("message").notNull(),
    context: text("context", { mode: "json" }).$type<JsonObject>(),
  },
  (table) => [
    index("job_logs_job_id_timestamp_idx").on(table.jobId, table.timestamp),
  ],
);

export const processedEvents = sqliteTable(
  "processed_events",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    nodeId: text("node_id"),
    payloadHash: text("payload_hash").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp" }).notNull(),
    processedAt: integer("processed_at", { mode: "timestamp" }),
  },
  (table) => [uniqueIndex("processed_events_event_id_unique").on(table.eventId)],
);

export const resourceLocks = sqliteTable(
  "resource_locks",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type").notNull(),
    resourceKey: text("resource_key").notNull(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    acquiredAt: integer("acquired_at", { mode: "timestamp" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    heartbeatAt: integer("heartbeat_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("resource_locks_resource_unique").on(
      table.resourceType,
      table.resourceKey,
    ),
    index("resource_locks_job_id_idx").on(table.jobId),
  ],
);

export const contentOutputs = sqliteTable(
  "content_outputs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    status: text("status", {
      enum: ["draft", "published", "archived", "regenerated"],
    }).notNull(),
    currentRevision: integer("latest_version").notNull().default(1),
    wordpressPostId: integer("wordpress_post_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("content_outputs_project_id_idx").on(table.projectId)],
);

export const contentRevisions = sqliteTable(
  "content_revisions",
  {
    id: text("id").primaryKey(),
    contentOutputId: text("content_output_id")
      .notNull()
      .references(() => contentOutputs.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    contentMarkdown: text("content_markdown"),
    contentHtml: text("content_html"),
    seoScore: integer("seo_score"),
    wordCount: integer("word_count"),
    tokensUsed: integer("tokens_used"),
    readingTime: integer("reading_time"),
    metadata: text("metadata", { mode: "json" }).$type<JsonObject>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("content_revisions_output_version_unique").on(
      table.contentOutputId,
      table.version,
    ),
  ],
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    outputId: text("output_id").references(() => contentOutputs.id, {
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
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("assets_storage_key_unique").on(
      table.storageProvider,
      table.bucket,
      table.storageKey,
    ),
  ],
);

export const knowledgeBase = sqliteTable(
  "knowledge_base",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type", { enum: ["text", "url", "asset"] }).notNull(),
    content: text("content"),
    assetId: text("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("knowledge_base_project_id_idx").on(table.projectId)],
);

export const prompts = sqliteTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    variables: text("variables", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("prompts_project_id_idx").on(table.projectId)],
);

export const promptVersions = sqliteTable(
  "prompt_versions",
  {
    id: text("id").primaryKey(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    createdBy: text("created_by").references(() => users.id, {
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

export const promptRuns = sqliteTable(
  "prompt_runs",
  {
    id: text("id").primaryKey(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    promptVersionId: text("prompt_version_id")
      .notNull()
      .references(() => promptVersions.id, { onDelete: "restrict" }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    variables: text("variables", { mode: "json" })
      .$type<JsonObject>()
      .notNull(),
    resolvedPrompt: text("resolved_prompt").notNull(),
    modelProvider: text("model_provider").notNull(),
    model: text("model").notNull(),
    runtimeInput: text("runtime_input", { mode: "json" }).$type<JsonObject>(),
    runtimeOutput: text("runtime_output", { mode: "json" }).$type<JsonObject>(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    durationMs: integer("duration_ms"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("prompt_runs_prompt_id_idx").on(table.promptId)],
);

export const aiTestRuns = sqliteTable(
  "ai_test_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
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

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    details: text("details", { mode: "json" }).$type<JsonObject>(),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("audit_logs_workspace_timestamp_idx").on(
      table.workspaceId,
      table.timestamp,
    ),
  ],
);

export const featureFlags = sqliteTable(
  "feature_flags",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    config: text("config", { mode: "json" }).$type<JsonObject>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("feature_flags_workspace_key_unique").on(
      table.workspaceId,
      table.key,
    ),
  ],
);
