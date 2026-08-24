import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type MakeModule = {
  id: number;
  module: string;
  parameters?: Record<string, unknown>;
  mapper?: Record<string, unknown>;
  onerror?: MakeModule[];
  routes?: Array<{ flow?: MakeModule[] }>;
};

type MakeBlueprint = {
  name?: string;
  flow?: MakeModule[];
};

const defaultPath = resolve(
  "docs/integration/make-blueprints/RIS 3.5 Module 1 - Sitemap - Neon Canary.blueprint.json",
);
const blueprintPath = resolve(process.argv[2] ?? defaultPath);
const source = readFileSync(blueprintPath, "utf8");
const blueprint = JSON.parse(source) as MakeBlueprint;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function flattenModules(flow: MakeModule[]): MakeModule[] {
  return flow.flatMap((module) => [
    module,
    ...flattenModules(module.onerror ?? []),
    ...(module.routes ?? []).flatMap((route) => flattenModules(route.flow ?? [])),
  ]);
}

function assertMapped(
  module: MakeModule,
  expectedKeys: string[],
  label: string,
) {
  const mapper = module.mapper ?? {};
  invariant(
    Object.keys(mapper).sort().join("|") === expectedKeys.sort().join("|"),
    `${label} has unexpected dynamic parameter keys: ${Object.keys(mapper).join(", ")}`,
  );

  for (const key of expectedKeys) {
    invariant(
      typeof mapper[key] === "string" && mapper[key].length > 0,
      `${label} has an empty mapping for ${key}`,
    );
  }
}

invariant(Array.isArray(blueprint.flow), "Blueprint flow is missing.");
invariant(
  ["v1.2", "v1.3", "v1.4"].some((version) => blueprint.name?.endsWith(version)),
  "Blueprint name must identify a reviewed contract (v1.2, v1.3 or v1.4).",
);

const modules = flattenModules(blueprint.flow);
const moduleById = new Map(modules.map((module) => [module.id, module]));
const postgresModules = modules.filter(
  (module) => module.module === "postgres:StoredProcedure",
);
const deepSeekModules = modules.filter(
  (module) => module.module === "deepseek-ai:createAChatCompletion",
);
const disallowedModules = modules.filter((module) =>
  /^(google-sheets|wordpress|facebook):/u.test(module.module),
);

invariant(modules.length === 7, `Expected 7 modules, received ${modules.length}.`);
invariant(
  postgresModules.length === 4,
  `Expected 4 PostgreSQL modules, received ${postgresModules.length}.`,
);
invariant(
  deepSeekModules.length === 2,
  `Expected 2 DeepSeek modules, received ${deepSeekModules.length}.`,
);
invariant(
  disallowedModules.length === 0,
  `Disallowed live modules found: ${disallowedModules
    .map((module) => module.module)
    .join(", ")}`,
);

const webhook = moduleById.get(1);
invariant(webhook?.module === "gateway:CustomWebHook", "Module 1 must be a webhook.");
invariant(
  Number.isInteger(webhook.parameters?.hook),
  "The account-bound webhook ID is missing.",
);

for (const scenarioModule of postgresModules) {
  invariant(
    Number.isInteger(scenarioModule.parameters?.account),
    `PostgreSQL module ${scenarioModule.id} has no account-bound connection.`,
  );
}

for (const scenarioModule of deepSeekModules) {
  invariant(
    Number.isInteger(scenarioModule.parameters?.__IMTCONN__),
    `DeepSeek module ${scenarioModule.id} has no account-bound connection.`,
  );
}

const claim = moduleById.get(2);
const complete = moduleById.get(5);
const failCreate = moduleById.get(6);
const failSelect = moduleById.get(7);
invariant(claim, "Claim module is missing.");
invariant(complete, "Complete module is missing.");
invariant(failCreate, "Generation failure handler is missing.");
invariant(failSelect, "Selection failure handler is missing.");

assertMapped(claim, ["@01:uuid", "@02:uuid"], "Claim module");
assertMapped(
  complete,
  ["@01:uuid", "@02:uuid", "@03:jsonb"],
  "Complete module",
);
assertMapped(
  failCreate,
  ["@01:uuid", "@02:uuid", "@03:text"],
  "Generation failure handler",
);
assertMapped(
  failSelect,
  ["@01:uuid", "@02:uuid", "@03:text"],
  "Selection failure handler",
);

const forbiddenImlPatterns: Array<[RegExp, string]> = [
  [/parseJSON\([^)]*\)\s*\[/u, "array bracket access after parseJSON"],
  [/\}\}\s*\{\{\s*\[/u, "split Make expressions"],
  [/parseJSON\([^)]*\)\s*\+\s*\[/u, "implicit array addition"],
  [/@p_(?:job|idempotency|output|error)/u, "name-based PostgreSQL mapper key"],
];

for (const [pattern, label] of forbiddenImlPatterns) {
  invariant(!pattern.test(source), `Forbidden ${label} remains in blueprint.`);
}

const openExpressions = source.match(/\{\{/gu)?.length ?? 0;
const closeExpressions = source.match(/\}\}/gu)?.length ?? 0;
invariant(
  openExpressions === closeExpressions,
  `Unbalanced IML expressions: ${openExpressions} openings, ${closeExpressions} closings.`,
);

const secretPatterns: Array<[RegExp, string]> = [
  [/postgres(?:ql)?:\/\//iu, "PostgreSQL URL"],
  [/\bsk-[a-z0-9_-]{12,}\b/iu, "API key"],
  [/hooks\.make\.com\//iu, "Make webhook URL"],
];

for (const [pattern, label] of secretPatterns) {
  invariant(!pattern.test(source), `${label} must not be embedded in the blueprint.`);
}

process.stdout.write(
  `${JSON.stringify({
    blueprint: blueprint.name,
    modules: modules.length,
    postgresModules: postgresModules.length,
    deepSeekModules: deepSeekModules.length,
    disallowedModules: disallowedModules.length,
    accountBoundConnections: postgresModules.length + deepSeekModules.length,
    webhookBound: true,
    imlExpressions: openExpressions,
    status: "valid",
  })}\n`,
);
