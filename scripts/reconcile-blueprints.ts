import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const expectedBlueprintFiles = [
  "RIS 3.5 Module #1 - Sitemap.blueprint.json",
  "RIS 3.5 Module #2 - Sitemap Keywords.blueprint.json",
  "RIS 3.5 Module #3 - ICN Keywords.blueprint.json",
  "RIS 3.5 Module #4 - Imported Keywords.blueprint.json",
  "RIS 3.5 Module #5 - On-Page SEO.blueprint.json",
  "RIS 3.5 Module #6 - Home Page Content.blueprint.json",
  "RIS 3.5 Module #7 - Content Headline.blueprint.json",
  "RIS 3.5 Module #8 - Content Intro.blueprint.json",
  "RIS 3.5 Module #10 - Content Sections.blueprint.json",
  "RIS 3.5 Module #12 - Upload to WordPress & FB.blueprint.json",
] as const;

type Confidence =
  | "confirmed_from_blueprint"
  | "inferred_from_module_references"
  | "requires_sheet_verification";

interface ModuleNode {
  id: string | number;
  module: string;
  mapper?: unknown;
  parameters?: unknown;
  metadata?: unknown;
  [key: string]: unknown;
}

interface CollectedModule {
  node: ModuleNode;
  modulePath: string;
}

interface ModuleReference {
  sourceModuleId: string;
  fieldPath: string;
  expression: string;
  configPath: string;
}

type GoogleSheetModuleMap = ReturnType<typeof mapGoogleSheetModule>;

interface ScenarioEvidence {
  scenarioNumber: number;
  scenarioName: string;
  sourceFile: string;
  sourceSha256: string;
  moduleCount: number;
  moduleIds: Array<string | number>;
  trigger: {
    moduleId: string | number;
    module: string;
    modulePath: string;
    type: string;
    hookReference: string | number | boolean | null;
    restoreLabel: string | number | boolean | null;
    maxResults: string | number | boolean | null;
    confidence: Confidence;
    payloadSchemaDeclared: boolean;
    declaredPayloadFields: string[];
    observedReferencedFields: string[];
    observedReferencedFieldsConfidence: Confidence;
    note: string;
  } | null;
  spreadsheetReferences: ReturnType<typeof groupSpreadsheetReferences>;
  googleSheetModules: GoogleSheetModuleMap[];
  nonSheetSideEffects: Array<{
    moduleId: string | number;
    module: string;
    modulePath: string;
    inputReferences: ModuleReference[];
    downstreamReferences: Array<Record<string, unknown>>;
    actionConfiguration: Record<string, unknown>;
    confidence: Confidence;
  }>;
  antigravityCallback: {
    detected: boolean;
    matchingModules: Array<{
      moduleId: string | number;
      module: string;
      modulePath: string;
    }>;
    confidence: Confidence;
    note: string;
  };
  completion: {
    mode: "unknown";
    confidence: Confidence;
    rationale: string;
  };
  timeoutAndRetry: {
    blueprintDefined: false;
    timeoutSeconds: null;
    maxRetries: null;
    note: string;
  };
  matrixConflicts: string[];
  internalBlueprintAnomalies: string[];
  openVerification: string[];
}

const matrixConflictsByScenario: Record<number, string[]> = {
  1: [
    "The matrix says Antigravity writes Setup!A2:J2; the scenario only reads Setup!A2:J2 through Setup!A5:J5.",
    "The matrix names Sitemap!A2:A as the output. The blueprint writes Sitemap!D3:D200 and Sitemap-Working!A1, A3, A5, and A7.",
    "The matrix declares an Antigravity callback; the blueprint contains no HTTP or webhook-response module.",
  ],
  2: [
    "The matrix says input is written to Sitemap!A2:A and output is Sitemap Keywords!A2:D. Neither mapping exists in the blueprint.",
    "The blueprint reads Sitemap/Sitemap1/Sitemap2/Sitemap3 at D4:D and updates Keywords/keywords 1/keyword 2/keywords 3 rows.",
    "Four clear-range modules omit sheetId, so their target sheet cannot be proved from JSON.",
  ],
  3: [
    "The matrix names Seed Keywords!A2:A and ICN Keywords!A2:E. Neither sheet is referenced by the blueprint.",
    "The blueprint clears and writes A1, A3, and A5 in four Keyword Research working-sheet variants while reading Setup rows 2 through 5.",
  ],
  4: [
    "The matrix says Antigravity appends Imported Keywords!A2:D and treats that range as output.",
    "The blueprint only reads Imported Keywords!A2:B, then clears and writes Keyword Research (Working)!A7; it has no append module.",
  ],
  5: [
    "The matrix names Selected Keywords!A2:A and On-Page SEO!A2:D. Selected Keywords is absent.",
    "The blueprint reads On-Page SEO variants at A2:F, clears dynamic C:F ranges, and writes zero-based values.2 through values.5 to rows in the On-Page SEO variants.",
    "Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.",
  ],
  6: [
    "The matrix says Antigravity writes Setup!E2 and output is Home Page!A2:D.",
    "The blueprint does not write Setup; it reads Setup rows 2 through 5 and writes only A2 in Home Page, Home Page 1, Home Page 2, and Home Page 3.",
  ],
  7: [
    "The matrix names On-Page SEO!A2:D as bridge input and Content Headline!A2:C as output. Content Headline is not referenced as a sheet.",
    "The blueprint reads Setup and On-Page SEO variants, clears dynamic I:J ranges, and writes zero-based values.8 and values.9 back to On-Page SEO variants.",
    "Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.",
  ],
  8: [
    "The matrix names Content Headline!A2:C as input and Content Intro!A2:C as output. Neither sheet is referenced.",
    "The blueprint reads Setup and On-Page SEO variants, clears dynamic K:K cells, and writes zero-based values.10 back to On-Page SEO variants.",
    "Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.",
  ],
  10: [
    "The matrix names Content Intro!A2:C as input and Content Sections!A2:E as output. Neither sheet is referenced.",
    "The blueprint reads Setup and On-Page SEO variants, clears dynamic M:S ranges, and writes cells M through S back to those variants.",
    "Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.",
  ],
  12: [
    "The matrix names Upload Status!A2:D as output. The blueprint has no Google Sheet write or Upload Status sheet reference.",
    "The blueprint reads On-Page SEO!A2:Z500 and routes rows to two wordpress:createPost modules (publish and draft). No Facebook module is present despite the scenario name.",
    "The matrix declares a callback and remote persistence fields; neither is encoded in the blueprint.",
  ],
};

const internalBlueprintAnomaliesByScenario: Record<number, string[]> = {
  3: [
    "Module 41 writes Keyword Research (Working)!A3 inside the route whose other working-sheet modules target the exact leading-space tab \" Keyword Research(Working) 1\".",
  ],
  5: [
    "Module 50 writes On-Page SEO while its route reads \" On-Page SEO 1\" with module 42.",
    "Module 52 targets \" On-Page SEO 1\" but uses the Setup reader module 41 row number instead of module 42's On-Page SEO row number.",
    "Module 62 targets On-Page SEO 2 but uses the Setup reader module 53 row number instead of module 54's On-Page SEO row number.",
  ],
  7: [
    "The Setup row-4 route reads \" On-Page SEO 1\" with module 31, then module 36 reads and module 38 writes On-Page SEO 2 using module 31's row number.",
  ],
  8: [
    "Module 23 writes On-Page SEO 3 using the row number read from On-Page SEO 2 by module 19.",
  ],
};

async function main(): Promise<void> {
  const sourceDirectory = resolveArgument("--source") ?? path.resolve(
    process.env.USERPROFILE ?? "C:/Users/sonkh",
    "Downloads",
  );
  const outputPath = path.resolve(
    resolveArgument("--output") ??
      "docs/integration/blueprint-module-map.json",
  );
  const reportPath = path.resolve(
    resolveArgument("--report") ??
      "docs/integration/blueprint-reconciliation-v1.md",
  );
  const blockersPath = path.resolve(
    resolveArgument("--blockers") ??
      "docs/integration/open-sheet-verification-blockers.md",
  );

  const scenarios: ScenarioEvidence[] = [];
  for (const sourceFile of expectedBlueprintFiles) {
    const absolutePath = path.join(sourceDirectory, sourceFile);
    const raw = await readFile(absolutePath, "utf8");
    const blueprint = JSON.parse(raw) as unknown;
    if (!isRecord(blueprint) || typeof blueprint.name !== "string") {
      throw new Error(`${sourceFile} is not a recognized Make blueprint.`);
    }
    const modules: CollectedModule[] = [];
    collectModules(blueprint.flow, "flow", modules);
    const references = modules.flatMap(({ node }) =>
      extractModuleReferences(node),
    );
    const downstreamBySource = new Map<string, Array<Record<string, unknown>>>();
    for (const target of modules) {
      for (const reference of extractModuleReferences(target.node)) {
        const current = downstreamBySource.get(reference.sourceModuleId) ?? [];
        current.push({
          targetModuleId: target.node.id,
          targetModule: target.node.module,
          targetModulePath: target.modulePath,
          targetConfigPath: reference.configPath,
          fieldPath: reference.fieldPath,
          expression: reference.expression,
          confidence: "inferred_from_module_references" satisfies Confidence,
        });
        downstreamBySource.set(reference.sourceModuleId, current);
      }
    }

    const googleSheetModules = modules
      .filter(({ node }) => node.module.startsWith("google-sheets:"))
      .map(({ node, modulePath }) =>
        mapGoogleSheetModule(
          node,
          modulePath,
          downstreamBySource.get(String(node.id)) ?? [],
        ),
      );
    const trigger = modules.find(
      ({ node }) => node.module === "gateway:CustomWebHook",
    );
    const callbackModules = modules.filter(
      ({ node }) =>
        node.module === "gateway:WebhookResponse" ||
        node.module.startsWith("http:"),
    );
    const wordpressModules = modules
      .filter(({ node }) => node.module.startsWith("wordpress:"))
      .map(({ node, modulePath }) => ({
        moduleId: node.id,
        module: node.module,
        modulePath,
        inputReferences: extractModuleReferences(node),
        downstreamReferences:
          downstreamBySource.get(String(node.id)) ?? [],
        actionConfiguration: selectWordpressConfiguration(node.mapper),
        confidence: "confirmed_from_blueprint" as const,
      }));

    const triggerId = trigger ? String(trigger.node.id) : undefined;
    const triggerReferencedFields = triggerId
      ? unique(
          references
            .filter((reference) => reference.sourceModuleId === triggerId)
            .map((reference) => reference.fieldPath),
        )
      : [];
    const spreadsheetReferences = groupSpreadsheetReferences(
      googleSheetModules,
    );
    const scenarioNumber = parseScenarioNumber(blueprint.name);
    const triggerParameters =
      trigger && isRecord(trigger.node.parameters)
        ? trigger.node.parameters
        : {};
    const triggerMetadata =
      trigger && isRecord(trigger.node.metadata) ? trigger.node.metadata : {};
    const triggerRestore = isRecord(triggerMetadata.restore)
      ? triggerMetadata.restore
      : {};
    const triggerRestoreParameters = isRecord(triggerRestore.parameters)
      ? triggerRestore.parameters
      : {};
    const triggerRestoreHook = isRecord(triggerRestoreParameters.hook)
      ? triggerRestoreParameters.hook
      : {};

    scenarios.push({
      scenarioNumber,
      scenarioName: blueprint.name,
      sourceFile,
      sourceSha256: createHash("sha256").update(raw).digest("hex"),
      moduleCount: modules.length,
      moduleIds: modules.map(({ node }) => node.id),
      trigger: trigger
        ? {
            moduleId: trigger.node.id,
            module: trigger.node.module,
            modulePath: trigger.modulePath,
            type: "custom_webhook",
            hookReference: primitiveOrNull(triggerParameters.hook),
            restoreLabel: primitiveOrNull(triggerRestoreHook.label),
            maxResults: primitiveOrNull(triggerParameters.maxResults),
            confidence: "confirmed_from_blueprint" satisfies Confidence,
            payloadSchemaDeclared: false,
            declaredPayloadFields: [],
            observedReferencedFields: triggerReferencedFields,
            observedReferencedFieldsConfidence:
              "inferred_from_module_references" satisfies Confidence,
            note:
              "The custom webhook starts the scenario. The blueprint does not declare an Antigravity request payload schema.",
          }
        : null,
      spreadsheetReferences,
      googleSheetModules,
      nonSheetSideEffects: wordpressModules,
      antigravityCallback: {
        detected: callbackModules.length > 0,
        matchingModules: callbackModules.map(({ node, modulePath }) => ({
          moduleId: node.id,
          module: node.module,
          modulePath,
        })),
        confidence: "confirmed_from_blueprint" satisfies Confidence,
        note:
          callbackModules.length === 0
            ? "No HTTP module or webhook-response module exists in the scenario; no callback to Antigravity is present."
            : "A callback-like module exists and requires endpoint-level review.",
      },
      completion: {
        mode: "unknown",
        confidence: "confirmed_from_blueprint" satisfies Confidence,
        rationale:
          "The scenario has an inbound custom webhook but no Antigravity callback. Polling may be a later bridge strategy, but it is not defined by this blueprint.",
      },
      timeoutAndRetry: {
        blueprintDefined: false,
        timeoutSeconds: null,
        maxRetries: null,
        note:
          "Scenario-level Antigravity timeout/retry policy is not encoded in the blueprint and must come from a reviewed system decision.",
      },
      matrixConflicts: matrixConflictsByScenario[scenarioNumber] ?? [],
      internalBlueprintAnomalies:
        internalBlueprintAnomaliesByScenario[scenarioNumber] ?? [],
      openVerification: [
        "Verify that every configured spreadsheet reference still resolves to the intended live spreadsheet.",
        "Verify exact live sheet names, including leading/trailing whitespace.",
        "Verify current header labels and column order against metadata.interface declarations.",
        "Define a completion signal and polling read target before any BridgeMapping is activated.",
      ],
    });
  }

  scenarios.sort((left, right) => left.scenarioNumber - right.scenarioNumber);
  const output = {
    schemaVersion: "1.0.0",
    document: "Blueprint Reconciliation v1 module map",
    generatedDate: "2026-07-21",
    status: "evidence_only_not_approved_for_live_bridge",
    scope: {
      suppliedBlueprintCount: expectedBlueprintFiles.length,
      sourceFiles: expectedBlueprintFiles,
      additionalBlueprintsExcluded: true,
    },
    confidenceLevels: {
      confirmed_from_blueprint:
        "Literal module configuration or module presence in the supplied JSON.",
      inferred_from_module_references:
        "Derived from explicit Make mapping expressions between module IDs.",
      requires_sheet_verification:
        "Blueprint metadata/configuration exists, but the current live Google Sheet has not been verified.",
    },
    safety: {
      liveWebhookCallsPerformed: false,
      googleSheetReadsOrWritesPerformed: false,
      callbackImplementationCreated: false,
      automationProviderChangedFromMock: false,
      phase3Started: false,
    },
    bridgeActivation: {
      allowed: false,
      blockersDocument: "docs/integration/open-sheet-verification-blockers.md",
    },
    scenarios,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeFile(reportPath, renderReconciliation(scenarios), "utf8");
  await writeFile(blockersPath, renderBlockers(scenarios), "utf8");
  console.log(
    JSON.stringify({
      output: path.relative(process.cwd(), outputPath),
      report: path.relative(process.cwd(), reportPath),
      blockers: path.relative(process.cwd(), blockersPath),
      scenarios: scenarios.length,
      modules: scenarios.reduce((sum, scenario) => sum + scenario.moduleCount, 0),
      googleSheetModules: scenarios.reduce(
        (sum, scenario) => sum + scenario.googleSheetModules.length,
        0,
      ),
    }),
  );
}

function collectModules(
  value: unknown,
  currentPath: string,
  output: CollectedModule[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectModules(item, `${currentPath}[${index}]`, output),
    );
    return;
  }
  if (!isRecord(value)) return;

  if (
    (typeof value.id === "number" || typeof value.id === "string") &&
    typeof value.module === "string"
  ) {
    output.push({ node: value as ModuleNode, modulePath: currentPath });
    for (const [key, child] of Object.entries(value)) {
      if (!["mapper", "metadata", "parameters"].includes(key)) {
        collectModules(child, `${currentPath}.${key}`, output);
      }
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    collectModules(child, `${currentPath}.${key}`, output);
  }
}

function extractModuleReferences(node: ModuleNode): ModuleReference[] {
  const sources: Array<[string, unknown]> = [
    ["mapper", node.mapper],
    ["parameters", node.parameters],
  ];
  if (node.filter !== undefined) sources.push(["filter", node.filter]);
  const references: ModuleReference[] = [];
  for (const [sourceName, source] of sources) {
    collectReferenceStrings(source, sourceName, references);
  }
  return uniqueBy(
    references,
    (reference) =>
      `${reference.sourceModuleId}|${reference.fieldPath}|${reference.expression}|${reference.configPath}`,
  );
}

function collectReferenceStrings(
  value: unknown,
  currentPath: string,
  output: ModuleReference[],
): void {
  if (typeof value === "string") {
    const pattern = /\{\{\s*(\d+)\.([^}]+)}}/g;
    for (const match of value.matchAll(pattern)) {
      output.push({
        sourceModuleId: match[1],
        fieldPath: match[2].trim(),
        expression: match[0],
        configPath: currentPath,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectReferenceStrings(item, `${currentPath}[${index}]`, output),
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    collectReferenceStrings(child, `${currentPath}.${key}`, output);
  }
}

function mapGoogleSheetModule(
  node: ModuleNode,
  modulePath: string,
  downstreamReferences: Array<Record<string, unknown>>,
) {
  const mapper = isRecord(node.mapper) ? node.mapper : {};
  const metadata = isRecord(node.metadata) ? node.metadata : {};
  const restore = isRecord(metadata.restore) ? metadata.restore : {};
  const expect = isRecord(restore.expect) ? restore.expect : {};
  const spreadsheetRestore = isRecord(expect.spreadsheetId)
    ? expect.spreadsheetId
    : {};
  const sheetRestore = isRecord(expect.sheetId) ? expect.sheetId : {};
  const sheetName = primitiveOrNull(mapper.sheetId);
  const spreadsheetId = primitiveOrNull(mapper.spreadsheetId);
  const operation = classifyOperation(node.module);

  return {
    moduleId: node.id,
    module: node.module,
    modulePath,
    operation,
    operationConfidence: "confirmed_from_blueprint" satisfies Confidence,
    spreadsheet: {
      idOrReference: spreadsheetId,
      restorePath: primitiveArray(spreadsheetRestore.path),
      confidence: "confirmed_from_blueprint" satisfies Confidence,
      liveVerification: "requires_sheet_verification" satisfies Confidence,
    },
    sheet: {
      name: sheetName,
      restoreLabel: primitiveOrNull(sheetRestore.label),
      exactWhitespacePreserved: typeof sheetName === "string",
      configurationStatus:
        sheetName === null ? "missing_from_blueprint" : "configured",
      confidence: (sheetName === null
        ? "requires_sheet_verification"
        : "confirmed_from_blueprint") satisfies Confidence,
      liveVerification: "requires_sheet_verification" satisfies Confidence,
    },
    addressing: selectAddressing(mapper),
    writeMappings: selectWriteMappings(mapper),
    declaredOutputInterface: selectOutputInterface(metadata.interface),
    declaredOutputInterfaceConfidence:
      "requires_sheet_verification" satisfies Confidence,
    inputReferences: extractModuleReferences(node),
    inputReferencesConfidence:
      "inferred_from_module_references" satisfies Confidence,
    downstreamReferences,
    referencedOutputFields: unique(
      downstreamReferences
        .map((reference) => reference.fieldPath)
        .filter((field): field is string => typeof field === "string"),
    ),
    outputDestination: describeOutputDestination(
      operation,
      sheetName,
      mapper,
    ),
    confidence: (sheetName === null || spreadsheetId === null
      ? "requires_sheet_verification"
      : "confirmed_from_blueprint") satisfies Confidence,
  };
}

function classifyOperation(moduleType: string): string {
  const operations: Record<string, string> = {
    "google-sheets:getSheetContent": "read",
    "google-sheets:getCell": "read",
    "google-sheets:clearCell": "clear",
    "google-sheets:clearValuesFromRange": "clear",
    "google-sheets:updateCell": "update_cell",
    "google-sheets:updateRow": "update_row",
  };
  return operations[moduleType] ?? "unknown";
}

function selectAddressing(mapper: Record<string, unknown>) {
  const keys = [
    "range",
    "cell",
    "rowNumber",
    "tableFirstRow",
    "includesHeaders",
    "valueRenderOption",
    "dateTimeRenderOption",
  ];
  return Object.fromEntries(
    keys
      .filter((key) => mapper[key] !== undefined)
      .map((key) => [key, mapper[key]]),
  );
}

function selectWriteMappings(mapper: Record<string, unknown>) {
  const mappings: Array<Record<string, unknown>> = [];
  if (mapper.value !== undefined) {
    mappings.push({
      target: "value",
      value: mapper.value,
      references: referencesFromValue(mapper.value, "value"),
    });
  }
  if (mapper.values !== undefined) {
    flattenLeaves(mapper.values, "values", mappings);
  }
  return mappings;
}

function flattenLeaves(
  value: unknown,
  currentPath: string,
  output: Array<Record<string, unknown>>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flattenLeaves(item, `${currentPath}[${index}]`, output),
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenLeaves(child, `${currentPath}.${key}`, output);
    }
    return;
  }
  output.push({
    target: currentPath,
    value,
    references: referencesFromValue(value, currentPath),
  });
}

function referencesFromValue(value: unknown, currentPath: string) {
  const references: ModuleReference[] = [];
  collectReferenceStrings(value, currentPath, references);
  return references;
}

function selectOutputInterface(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((field) => ({
      name: primitiveOrNull(field.name),
      type: primitiveOrNull(field.type),
      label: primitiveOrNull(field.label),
    }));
}

function selectWordpressConfiguration(value: unknown) {
  if (!isRecord(value)) return {};
  const keys = ["type", "status", "title", "slug", "content", "excerpt", "format", "meta"];
  return Object.fromEntries(
    keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]),
  );
}

function groupSpreadsheetReferences(
  modules: Array<ReturnType<typeof mapGoogleSheetModule>>,
) {
  const groups = new Map<
    string,
    {
      idOrReference: string | number | boolean | null;
      restorePaths: Array<string | number | boolean>;
      moduleIds: Array<string | number>;
      confidence: Confidence;
      liveVerification: Confidence;
    }
  >();
  for (const sheetModule of modules) {
    const key = JSON.stringify(sheetModule.spreadsheet.idOrReference);
    const existing = groups.get(key) ?? {
      idOrReference: sheetModule.spreadsheet.idOrReference,
      restorePaths: [],
      moduleIds: [],
      confidence: "confirmed_from_blueprint",
      liveVerification: "requires_sheet_verification",
    };
    existing.restorePaths.push(...sheetModule.spreadsheet.restorePath);
    existing.moduleIds.push(sheetModule.moduleId);
    groups.set(key, existing);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    restorePaths: unique(group.restorePaths),
    moduleIds: unique(group.moduleIds),
  }));
}

function describeOutputDestination(
  operation: string,
  sheetName: string | number | boolean | null,
  mapper: Record<string, unknown>,
) {
  if (operation === "read") {
    return {
      kind: "module_output_bundle",
      sheet: sheetName,
      address: mapper.range ?? mapper.cell ?? null,
    };
  }
  if (operation === "clear") {
    return {
      kind: "sheet_clear",
      sheet: sheetName,
      address: mapper.range ?? mapper.cell ?? null,
    };
  }
  return {
    kind: "sheet_write",
    sheet: sheetName,
    address: mapper.cell ?? mapper.rowNumber ?? null,
  };
}

function renderReconciliation(scenarios: ScenarioEvidence[]): string {
  const lines: string[] = [
    "# Blueprint Reconciliation v1",
    "",
    "Last updated: 2026-07-21 (Asia/Saigon)",
    "",
    "> Status: evidence extraction for the ten supplied blueprints is complete. This document is not approval to activate a live bridge or begin Phase 3.",
    "",
    "## Decision",
    "",
    "The supplied JSON proves the configured Make module graph, literal spreadsheet references, literal sheet/range/cell values, and inter-module expressions. It does not prove the current Google Sheet structure, a webhook request contract, or a completion protocol. All ten scenarios therefore remain in `completion.mode = unknown`, and BridgeMapping activation remains blocked pending the owner's review plus the verification items in `open-sheet-verification-blockers.md`.",
    "",
    "No live webhook was called, no Google Sheet was read or written, no callback was implemented, the automation registry remains mock-only, and Phase 3 was not started.",
    "",
    "## Scope and evidence rules",
    "",
    `- Included exactly ${scenarios.length} supplied blueprint JSON files: modules 1, 2, 3, 4, 5, 6, 7, 8, 10, and 12. Additional blueprints are excluded and do not block this v1 result.`,
    "- Actual Make behavior comes from blueprint JSON. The legacy integration matrix is compared as a claim set, not used to overwrite JSON.",
    "- Exact whitespace is preserved. JSON-quoted names below make leading spaces visible.",
    "- Header labels shown beside indexed fields come from Make's exported `metadata.interface`. They are evidence of the export, but the current live headers still require Sheet verification.",
    `- Dynamic expressions such as ${mdCode("{{3.`__ROW_NUMBER__`}}")}` +
      ` are recorded literally. Their dependency on another module is classified as ${mdCode("inferred_from_module_references")}.`,
    "- Matrix timeout/retry values are not adopted as blueprint facts. The supplied blueprints do not define an Antigravity timeout or retry policy; those values may only return through a reviewed system decision.",
    "",
    "## Confidence legend",
    "",
    "| Level | Meaning in this reconciliation |",
    "| --- | --- |",
    "| `confirmed_from_blueprint` | Literal module presence or configuration in a supplied JSON file. |",
    "| `inferred_from_module_references` | Derived from an explicit Make expression linking one module ID/field to another. |",
    "| `requires_sheet_verification` | The JSON omits the mapping, or the mapping/header must be checked against the current live Sheet before bridge use. |",
    "",
    "## Cross-blueprint findings",
    "",
  ];

  const googleModules = scenarios.flatMap(
    (scenario) => scenario.googleSheetModules,
  );
  const operationCounts = new Map<string, number>();
  for (const sheetModule of googleModules) {
    operationCounts.set(
      sheetModule.operation,
      (operationCounts.get(sheetModule.operation) ?? 0) + 1,
    );
  }
  const spreadsheetReferences = unique(
    googleModules.map((module) => String(module.spreadsheet.idOrReference)),
  );
  const restorePaths = unique(
    googleModules.flatMap((module) =>
      module.spreadsheet.restorePath.map((item) => String(item)),
    ),
  );
  const exactLeadingOrTrailingNames = unique(
    googleModules
      .map((module) => module.sheet.name)
      .filter(
        (name): name is string =>
          typeof name === "string" && name !== name.trim(),
      ),
  );
  const missingSheetModules = googleModules.filter(
    (module) => module.sheet.name === null,
  );

  lines.push(
    `- Total extracted: **${scenarios.reduce((sum, scenario) => sum + scenario.moduleCount, 0)} Make modules**, including **${googleModules.length} Google Sheet modules**.`,
    `- Google Sheet operations: ${[...operationCounts.entries()].map(([operation, count]) => `${mdCode(operation)} ${count}`).join(", ")}. There are **no search modules and no append modules** in these ten blueprints.`,
    `- Every Google Sheet module uses the same literal spreadsheet reference ${mdCode(spreadsheetReferences[0] ?? "<missing>")}. The exported restore path is ${mdCode(JSON.stringify(restorePaths[0] ?? "<missing>"))}; its leading space is preserved.`,
    `- All ten scenarios begin with a ${mdCode("gateway:CustomWebHook")} module. None exports a request payload schema, and none of the downstream module expressions references the webhook bundle.`,
    "- No scenario contains an HTTP module or `gateway:WebhookResponse`; therefore there is no callback to Antigravity in the supplied JSON.",
    "- `polling` is a possible future orchestration choice, not a behavior proved by these blueprints. Completion remains `unknown` for all ten.",
    `- Exact sheet names with leading/trailing whitespace: ${exactLeadingOrTrailingNames.map((name) => mdCode(JSON.stringify(name))).join(", ") || "none"}.`,
    `- ${missingSheetModules.length} clear-range modules have a spreadsheet and range but no ${mdCode("sheetId")}; those mappings are ${mdCode("requires_sheet_verification")}.`,
    "",
    "### Scenario inventory",
    "",
    "| Scenario | Webhook module / exported hook | Modules | Google Sheet operations | Exact referenced sheets | Callback | Completion |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
  );

  for (const scenario of scenarios) {
    const operationSummary = [...countOperations(
      scenario.googleSheetModules,
    ).entries()]
      .map(([operation, count]) => `${operation}=${count}`)
      .join(", ");
    const sheets = unique(
      scenario.googleSheetModules.map((module) => module.sheet.name),
    )
      .map((name) =>
        name === null ? "<missing sheetId>" : JSON.stringify(name),
      )
      .join(", ");
    const hook = scenario.trigger
      ? `#${scenario.trigger.moduleId} / ${String(scenario.trigger.hookReference)} (${String(scenario.trigger.restoreLabel)})`
      : "missing";
    lines.push(
      `| ${scenario.scenarioNumber} — ${escapeMarkdownTable(scenario.scenarioName)} | ${escapeMarkdownTable(hook)} | ${scenario.moduleCount} | ${escapeMarkdownTable(operationSummary)} | ${escapeMarkdownTable(sheets)} | no | unknown |`,
    );
  }

  lines.push(
    "",
    "## Global conflicts with `blueprint_integration_matrix.md`",
    "",
    "- The matrix treats `Setup!A2:J2` as a universal Antigravity write contract. The blueprints contain no Setup write modules. They read rows 2 through 5; modules 7, 8, and 10 read `A:Z`, not only `A:J`.",
    "- The matrix maps Setup column A to location and B to industry. Exported Make interfaces label A only as `(A)`, B as `Primary Keyword (B)`, C as `Tone of Voice (C)`, D as `Language (D)`, and E as `Website Brief (E)`. These labels still require live Sheet verification and must not yet become a domain mapping.",
    "- The matrix asserts a callback completion route for every scenario. The blueprint graph proves that no callback-capable module is present.",
    "- The matrix's provider keys, environment-variable names, webhook request shapes, persistence targets, timeouts, and retries are application/system design claims. They are not Make behavior encoded in the JSON.",
    "- Every matrix target range differs materially from at least one literal blueprint target; the per-scenario sections below enumerate the differences.",
    "",
    "## Per-blueprint reconciliation",
    "",
  );

  for (const scenario of scenarios) {
    lines.push(
      `### ${scenario.scenarioNumber}. ${scenario.scenarioName}`,
      "",
      `- Source: ${mdCode(scenario.sourceFile)}; SHA-256 ${mdCode(scenario.sourceSha256)}.`,
      `- Scenario module IDs: ${scenario.moduleIds.map((id) => mdCode(id)).join(", ")}.`,
      scenario.trigger
        ? `- Custom webhook: module ${mdCode(scenario.trigger.moduleId)}, exported hook reference ${mdCode(scenario.trigger.hookReference)}, restore label ${mdCode(JSON.stringify(scenario.trigger.restoreLabel))}, ${mdCode(`maxResults=${String(scenario.trigger.maxResults)}`)}. The export declares no payload schema.`
        : "- Custom webhook: missing.",
      `- Spreadsheet: ${scenario.spreadsheetReferences.map((reference) => `${mdCode(reference.idOrReference)} (restore path ${reference.restorePaths.map((item) => mdCode(JSON.stringify(item))).join(", ")})`).join("; ")}.`,
      "- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.",
      "- Timeout/retry: not defined as an Antigravity policy in the blueprint.",
      "",
      "Matrix conflicts:",
      "",
      ...scenario.matrixConflicts.map((conflict) => `- ${conflict}`),
    );

    if (scenario.internalBlueprintAnomalies.length > 0) {
      lines.push(
        "",
        "Internal blueprint anomalies (recorded, not corrected):",
        "",
        ...scenario.internalBlueprintAnomalies.map(
          (anomaly) => `- **Blocker:** ${anomaly}`,
        ),
      );
    }

    lines.push(
      "",
      "Google Sheet module evidence:",
      "",
      "| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |",
      "| ---: | --- | --- | --- | --- | --- | --- | --- |",
    );

    for (const sheetModule of scenario.googleSheetModules) {
      lines.push(renderGoogleModuleRow(sheetModule));
    }

    if (scenario.nonSheetSideEffects.length === 0) {
      lines.push(
        "",
        "Non-Sheet side effects: none in the blueprint.",
      );
    } else {
      lines.push("", "Non-Sheet side effects:", "");
      for (const sideEffect of scenario.nonSheetSideEffects) {
        const status = primitiveOrNull(sideEffect.actionConfiguration.status);
        const fields = unique(
          sideEffect.inputReferences.map(
            (reference) =>
              `${reference.sourceModuleId}.${reference.fieldPath}`,
          ),
        );
        lines.push(
          `- Module ${mdCode(sideEffect.moduleId)} ${mdCode(sideEffect.module)} creates a WordPress ${mdCode(sideEffect.actionConfiguration.type ?? "<unknown>")} with status ${mdCode(status)}. Referenced fields: ${fields.map((field) => mdCode(field)).join(", ")}. This is an external side effect, not a completion callback or Sheet output.`,
        );
      }
    }

    lines.push("");
  }

  lines.push(
    "## Evidence-only pilot recommendation before the owner decision",
    "",
    "**Recommended candidate: Module 4 — Imported Keywords**, after its blockers are resolved. It is the smallest graph (6 modules), has only three Google Sheet operations, reads one source range (`Imported Keywords!A2:B`), and has one clear/write output cell (`Keyword Research (Working)!A7`). It has no WordPress publishing side effect.",
    "",
    "This is only a pilot suitability assessment. Module 4 still has no declared webhook payload, callback, or completion marker; the meaning and writability of A7 and the live headers of A:B must be verified. The pilot must not start until the owner reviews this reconciliation and separately authorizes Phase 3.",
    "",
    "**Later owner decision (2026-07-21):** Module 1 was selected instead, using an API-native Neon/PostgreSQL bridge and a revised Make scenario that removes the Google Sheet runtime dependency. This does not change the evidence above or authorize any original Sheet-backed mapping. See `docs/integration/module1-neon-pilot.md`.",
    "",
    "## Machine-readable companion",
    "",
    "`blueprint-module-map.json` contains the exhaustive module paths, exact configuration, write mappings, exported interfaces, downstream references, confidence values, conflicts, anomalies, source hashes, and safety/activation flags. It is evidence input for a future BridgeMapping config, not an active config.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function renderBlockers(scenarios: ScenarioEvidence[]): string {
  const lines: string[] = [
    "# Open Sheet verification blockers",
    "",
    "Last updated: 2026-07-21 (Asia/Saigon)",
    "",
    "> Original Google Sheet-backed BridgeMapping activation remains blocked. The separately authorized API-native Module 1 pilot uses Neon/PostgreSQL and does not claim these Sheet blockers are resolved.",
    "",
    "## Classification",
    "",
    "- **unverified:** the blueprint exports a value or label, but the current Google Sheet has not been inspected.",
    "- **assumption:** a branch/module relationship suggests a mapping, but the JSON does not state it directly. Assumptions are never emitted as active BridgeMapping values.",
    "- **blocker:** information required for a safe live bridge is missing, contradictory, or not yet owner-approved.",
    "",
    "## Blocking items",
    "",
    "### B1 — Spreadsheet and tab identity is unverified",
    "",
    `All modules export the spreadsheet reference ${mdCode(scenarios[0]?.spreadsheetReferences[0]?.idOrReference ?? "<missing>")} and restore path ${mdCode(JSON.stringify(scenarios[0]?.spreadsheetReferences[0]?.restorePaths[0] ?? "<missing>"))}. The current file identity, exact tab inventory, numeric Sheet tab IDs, hidden/renamed tabs, and write permissions are unverified. Leading spaces in tab names are material.`,
    "",
    "### B2 — Twenty clear-range modules omit `sheetId`",
    "",
    "The following JSON modules define a spreadsheet and range but no target sheet. A sibling route may suggest a tab, but adopting it would be an assumption, not a confirmed mapping.",
    "",
    "| Scenario | Module ID | Exact range | Status |",
    "| --- | ---: | --- | --- |",
  ];

  for (const scenario of scenarios) {
    for (const sheetModule of scenario.googleSheetModules.filter(
      (candidate) => candidate.sheet.name === null,
    )) {
      lines.push(
        `| ${scenario.scenarioNumber} | ${sheetModule.moduleId} | ${escapeMarkdownTable(formatAddress(sheetModule))} | requires_sheet_verification |`,
      );
    }
  }

  lines.push(
    "",
    "A fresh Make export that retains `sheetId`, or a screenshot/text export of each listed module's selected Sheet tab, is required. A Google Sheet workbook export alone cannot prove which tab each omitted `sheetId` module targets.",
    "",
    "### B3 — Headers, indexed fields, and row semantics are unverified",
    "",
    "Make expressions refer to zero-based fields such as `` `0` ``, `` `8` ``, and `` `24` ``. Exported `metadata.interface` labels are recorded in the module map, but they do not prove the live header row or column order. The meaning of Setup rows 2, 3, 4, and 5 is also absent from the JSON.",
    "",
    "**Assumption not approved for bridge use:** the four router branches appear to correlate Setup rows 2–5 with base/variant tabs. Internal cross-tab references in modules 3, 5, 7, and 8 prevent treating that route pattern as authoritative.",
    "",
    "### B4 — Completion protocol is absent",
    "",
    "No blueprint sends an HTTP callback or webhook response to Antigravity. No stable completion/status cell is identified. Therefore all ten completion modes are `unknown`; neither callback nor polling can be activated until an explicit, verified completion signal is selected for each pilot/scenario.",
    "",
    "### B5 — Webhook invocation contract is absent",
    "",
    "Every scenario has a custom webhook module, but the exports declare no payload schema and downstream modules do not reference the webhook bundle. The JSON contains numeric hook references and labels, not a safe application request contract. Future live authorization must supply the secret webhook URL out of band and decide whether the bridge writes inputs to Sheet before sending an empty/minimal trigger.",
    "",
    "### B6 — Internal blueprint contradictions need owner/Make review",
    "",
  );

  for (const scenario of scenarios.filter(
    (candidate) => candidate.internalBlueprintAnomalies.length > 0,
  )) {
    for (const anomaly of scenario.internalBlueprintAnomalies) {
      lines.push(`- Scenario ${scenario.scenarioNumber}: ${anomaly}`);
    }
  }

  lines.push(
    "",
    "These modules are documented exactly as exported. Reconciliation v1 does not silently repair them.",
    "",
    "### B7 — Module 12 has no observable Sheet result",
    "",
    "Module 12 reads `On-Page SEO!A2:Z500` and can create a published or draft WordPress post. It writes no `Upload Status` range, exposes no callback, and contains no Facebook module. A safe idempotent result/remote-ID contract is required before this scenario can ever be a pilot; it is not a suitable first pilot.",
    "",
    "## Exact live-Sheet coverage that must be verified",
    "",
    "The table below lists literal configured Sheet/address pairs. Repeated rows are collapsed per scenario. `<missing sheetId>` entries remain covered by B2.",
    "",
    "| Scenario | Exact sheet | Configured address | Operations |",
    "| --- | --- | --- | --- |",
  );

  for (const scenario of scenarios) {
    const coverage = new Map<string, { sheet: string; address: string; operations: string[] }>();
    for (const sheetModule of scenario.googleSheetModules) {
      const sheet =
        sheetModule.sheet.name === null
          ? "<missing sheetId>"
          : JSON.stringify(sheetModule.sheet.name);
      const address = formatAddress(sheetModule);
      const key = `${sheet}|${address}`;
      const entry = coverage.get(key) ?? { sheet, address, operations: [] };
      entry.operations.push(sheetModule.operation);
      coverage.set(key, entry);
    }
    for (const entry of coverage.values()) {
      lines.push(
        `| ${scenario.scenarioNumber} | ${escapeMarkdownTable(entry.sheet)} | ${escapeMarkdownTable(entry.address)} | ${escapeMarkdownTable(unique(entry.operations).join(", "))} |`,
      );
    }
  }

  lines.push(
    "",
    "## Minimum information the owner needs to provide later",
    "",
    "1. A read-only `.xlsx` export of the referenced spreadsheet, preserving every referenced tab, header row, formulas, and the exact tab names.",
    "2. A tab manifest containing each exact tab title and its numeric Google Sheet `sheetId`/gid. This is necessary because workbook exports do not reliably preserve the API tab ID contract.",
    "3. For the 20 modules in B2, a fresh Make blueprint export that includes `sheetId`, or screenshots/text from the Make editor showing the selected tab for each module ID.",
    "4. Confirmation of what Setup rows 2–5 represent and the authoritative header/column meanings for `Setup`, all Sitemap/Keywords/Keyword Research variants, all On-Page SEO variants, Imported Keywords, and Home Page variants.",
    "5. Confirmation that every literal write/clear address is writable and whether formulas, protected ranges, merged cells, or data-validation rules occupy those targets.",
    "6. For the selected pilot, one explicit completion contract: the exact poll sheet/cell/range and terminal condition, or a separately reviewed callback design. Existing JSON proves neither.",
    "7. A reviewed disposition for each internal anomaly in B6: confirm it is intentional or provide a corrected Make export. Do not correct the mapping only in Markdown.",
    "8. Later, and only after Phase 3 is authorized, the webhook URL/ownership and invocation policy through the server-side secret resolver. Do not place the secret URL in these documents or browser code.",
    "",
    "## Pilot blocker summary",
    "",
    "The evidence-only assessment originally recommended Module 4 because it has the smallest Sheet-backed graph. The owner later selected Module 1 with a revised API-native Neon/PostgreSQL scenario. All blockers in this document still apply before any original Sheet-backed scenario or mapping is activated; they do not block the separately documented Module 1 rewrite.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function renderGoogleModuleRow(sheetModule: GoogleSheetModuleMap): string {
  const mappingParts: string[] = [];
  if (sheetModule.writeMappings.length > 0) {
    mappingParts.push(
      ...sheetModule.writeMappings.map(
        (mapping) =>
          `${mapping.target}=${stringifyCompact(mapping.value)}`,
      ),
    );
  }
  const inputExpressions = unique(
    sheetModule.inputReferences.map((reference) => reference.expression),
  );
  if (inputExpressions.length > 0) {
    mappingParts.push(`refs: ${inputExpressions.join(", ")}`);
  }

  const fieldInterface = new Map(
    sheetModule.declaredOutputInterface.map((field) => [
      String(field.name),
      field.label,
    ]),
  );
  const referencedFields = sheetModule.referencedOutputFields.map((field) => {
    const normalized = field.replaceAll("`", "");
    const label = fieldInterface.get(normalized);
    return label === null || label === undefined
      ? field
      : `${field} → ${String(label)}`;
  });
  const confidence = [sheetModule.confidence];
  if (
    sheetModule.referencedOutputFields.length > 0 ||
    inputExpressions.length > 0
  ) {
    confidence.push("inferred_from_module_references");
  }

  return [
    sheetModule.moduleId,
    `${sheetModule.module} / ${sheetModule.operation}`,
    formatSheetName(sheetModule.sheet.name),
    formatAddress(sheetModule),
    mappingParts.join("; ") || "—",
    referencedFields.join("; ") || "—",
    formatOutputDestination(sheetModule),
    unique(confidence).join(" + "),
  ]
    .map((cell) => escapeMarkdownTable(String(cell)))
    .join(" | ")
    .replace(/^/, "| ")
    .concat(" |");
}

function formatSheetName(value: string | number | boolean | null): string {
  if (value === null) return "<missing sheetId>";
  if (typeof value !== "string") return String(value);
  const whitespace = value !== value.trim() ? " [whitespace significant]" : "";
  return `${JSON.stringify(value)}${whitespace}`;
}

function formatAddress(sheetModule: GoogleSheetModuleMap): string {
  const entries = Object.entries(sheetModule.addressing);
  if (entries.length === 0) return "<none>";
  return entries
    .map(([key, value]) => `${key}=${stringifyCompact(value)}`)
    .join("; ");
}

function formatOutputDestination(sheetModule: GoogleSheetModuleMap): string {
  const destination = sheetModule.outputDestination;
  const sheet = formatSheetName(destination.sheet);
  const address = stringifyCompact(destination.address);
  return `${destination.kind}: ${sheet} @ ${address}`;
}

function countOperations(modules: GoogleSheetModuleMap[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const sheetModule of modules) {
    result.set(
      sheetModule.operation,
      (result.get(sheetModule.operation) ?? 0) + 1,
    );
  }
  return result;
}

function stringifyCompact(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "<undefined>";
  return JSON.stringify(value);
}

function mdCode(value: unknown): string {
  const rendered = stringifyCompact(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replaceAll("\n", "↵");
  return `<code>${rendered}</code>`;
}

function escapeMarkdownTable(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("|", "&#124;")
    .replaceAll("\r", "")
    .replaceAll("\n", "<br>");
}

function parseScenarioNumber(name: string): number {
  const match = name.match(/Module #(\d+)/);
  if (!match) throw new Error(`Cannot parse scenario number from ${name}.`);
  return Number(match[1]);
}

function resolveArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function primitiveOrNull(
  value: unknown,
): string | number | boolean | null {
  return ["string", "number", "boolean"].includes(typeof value)
    ? (value as string | number | boolean)
    : null;
}

function primitiveArray(value: unknown): Array<string | number | boolean> {
  return Array.isArray(value)
    ? value.filter((item): item is string | number | boolean =>
        ["string", "number", "boolean"].includes(typeof item),
      )
    : [];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const candidate = key(value);
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

void main();
