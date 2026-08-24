import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  BlueprintConfidence,
  BlueprintReconciliationView,
  BlueprintScenarioView,
  BlueprintSheetModuleView,
  BlueprintSheetView,
} from "@/domain/integration/blueprint-reconciliation";

const primitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const confidenceSchema = z.enum([
  "confirmed_from_blueprint",
  "inferred_from_module_references",
  "requires_sheet_verification",
]);

const sheetModuleSchema = z.object({
  moduleId: z.union([z.string(), z.number()]),
  module: z.string(),
  operation: z.string(),
  spreadsheet: z.object({
    idOrReference: primitiveSchema,
    restorePath: z.array(z.union([z.string(), z.number(), z.boolean()])),
  }),
  sheet: z.object({
    name: primitiveSchema,
  }),
  addressing: z.record(z.string(), z.unknown()),
  writeMappings: z.array(
    z.object({
      target: z.string(),
      value: z.unknown(),
    }),
  ),
  declaredOutputInterface: z.array(
    z.object({
      name: primitiveSchema,
      label: primitiveSchema,
    }),
  ),
  referencedOutputFields: z.array(z.string()),
  outputDestination: z.object({
    kind: z.string(),
    sheet: primitiveSchema,
    address: z.unknown(),
  }),
  confidence: confidenceSchema,
});

const scenarioSchema = z.object({
  scenarioNumber: z.number(),
  scenarioName: z.string(),
  sourceFile: z.string(),
  sourceSha256: z.string(),
  moduleCount: z.number(),
  trigger: z
    .object({
      moduleId: z.union([z.string(), z.number()]),
      hookReference: primitiveSchema,
      restoreLabel: primitiveSchema,
      maxResults: primitiveSchema,
      payloadSchemaDeclared: z.boolean(),
    })
    .nullable(),
  spreadsheetReferences: z.array(
    z.object({
      idOrReference: primitiveSchema,
      restorePaths: z.array(z.union([z.string(), z.number(), z.boolean()])),
    }),
  ),
  googleSheetModules: z.array(sheetModuleSchema),
  nonSheetSideEffects: z.array(
    z.object({
      moduleId: z.union([z.string(), z.number()]),
      module: z.string(),
      actionConfiguration: z.record(z.string(), z.unknown()),
    }),
  ),
  antigravityCallback: z.object({ detected: z.boolean() }),
  completion: z.object({
    mode: z.enum(["polling", "callback", "unknown"]),
  }),
  matrixConflicts: z.array(z.string()),
  internalBlueprintAnomalies: z.array(z.string()),
});

const moduleMapSchema = z.object({
  schemaVersion: z.string(),
  generatedDate: z.string(),
  status: z.string(),
  bridgeActivation: z.object({ allowed: z.boolean() }),
  scenarios: z.array(scenarioSchema),
});

export async function getBlueprintReconciliationView(): Promise<BlueprintReconciliationView> {
  const sourcePath = path.resolve(
    "docs/integration/blueprint-module-map.json",
  );
  const raw = await readFile(sourcePath, "utf8");
  const evidence = moduleMapSchema.parse(JSON.parse(raw));
  const scenarios = evidence.scenarios.map(toScenarioView);

  return {
    schemaVersion: evidence.schemaVersion,
    generatedDate: evidence.generatedDate,
    status: evidence.status,
    bridgeAllowed: evidence.bridgeActivation.allowed,
    stats: {
      scenarios: scenarios.length,
      makeModules: scenarios.reduce(
        (total, scenario) => total + scenario.moduleCount,
        0,
      ),
      googleSheetModules: scenarios.reduce(
        (total, scenario) => total + scenario.googleSheetModuleCount,
        0,
      ),
      missingSheetIds: scenarios.reduce(
        (total, scenario) => total + scenario.missingSheetIdCount,
        0,
      ),
      callbacks: scenarios.filter((scenario) => scenario.callbackDetected)
        .length,
      internalAnomalies: scenarios.reduce(
        (total, scenario) => total + scenario.internalAnomalies.length,
        0,
      ),
    },
    scenarios,
    pilotScenarioNumber: 1,
  };
}

function toScenarioView(
  scenario: z.infer<typeof scenarioSchema>,
): BlueprintScenarioView {
  const operationCounts = new Map<string, number>();
  for (const sheetModule of scenario.googleSheetModules) {
    operationCounts.set(
      sheetModule.operation,
      (operationCounts.get(sheetModule.operation) ?? 0) + 1,
    );
  }

  const exactSheets = uniqueSheets(
    scenario.googleSheetModules.map((sheetModule) =>
      toSheetView(sheetModule.sheet.name),
    ),
  );

  return {
    scenarioNumber: scenario.scenarioNumber,
    scenarioName: scenario.scenarioName,
    sourceFile: scenario.sourceFile,
    sourceSha256: scenario.sourceSha256,
    moduleCount: scenario.moduleCount,
    webhook: scenario.trigger
      ? {
          moduleId: String(scenario.trigger.moduleId),
          hookReference: formatValue(scenario.trigger.hookReference),
          label: formatValue(scenario.trigger.restoreLabel),
          maxResults: formatValue(scenario.trigger.maxResults),
          payloadSchemaDeclared: scenario.trigger.payloadSchemaDeclared,
        }
      : null,
    spreadsheetReference: formatValue(
      scenario.spreadsheetReferences[0]?.idOrReference ?? null,
    ),
    spreadsheetRestorePath: formatValue(
      scenario.spreadsheetReferences[0]?.restorePaths[0] ?? null,
    ),
    googleSheetModuleCount: scenario.googleSheetModules.length,
    operationCounts: [...operationCounts.entries()].map(
      ([operation, count]) => ({ operation, count }),
    ),
    exactSheets,
    missingSheetIdCount: scenario.googleSheetModules.filter(
      (sheetModule) => sheetModule.sheet.name === null,
    ).length,
    callbackDetected: scenario.antigravityCallback.detected,
    completionMode: scenario.completion.mode,
    matrixConflicts:
      matrixConflictTranslations[scenario.scenarioNumber] ??
      scenario.matrixConflicts,
    internalAnomalies:
      anomalyTranslations[scenario.scenarioNumber] ??
      scenario.internalBlueprintAnomalies,
    sheetModules: scenario.googleSheetModules.map(toSheetModuleView),
    sideEffects: scenario.nonSheetSideEffects.map((sideEffect) => ({
      moduleId: String(sideEffect.moduleId),
      module: sideEffect.module,
      status: formatValue(sideEffect.actionConfiguration.status ?? "unknown"),
    })),
  };
}

function toSheetModuleView(
  sheetModule: z.infer<typeof sheetModuleSchema>,
): BlueprintSheetModuleView {
  const interfaceLabels = new Map(
    sheetModule.declaredOutputInterface.map((field) => [
      formatValue(field.name),
      formatValue(field.label),
    ]),
  );
  const referencedFields = sheetModule.referencedOutputFields.map((field) => {
    const normalized = field.replaceAll("`", "");
    const label = interfaceLabels.get(normalized);
    return label && label !== "null" ? `${field} → ${label}` : field;
  });
  const confidence: BlueprintConfidence[] = [sheetModule.confidence];
  if (referencedFields.length > 0 || sheetModule.writeMappings.length > 0) {
    confidence.push("inferred_from_module_references");
  }

  return {
    moduleId: String(sheetModule.moduleId),
    makeModule: sheetModule.module,
    operation: sheetModule.operation,
    sheet: toSheetView(sheetModule.sheet.name),
    address: Object.entries(sheetModule.addressing)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join("; "),
    writeMappings: sheetModule.writeMappings.map(
      (mapping) => `${mapping.target}=${formatValue(mapping.value)}`,
    ),
    referencedFields,
    outputDestination: `${sheetModule.outputDestination.kind}: ${formatSheetName(sheetModule.outputDestination.sheet)} @ ${formatValue(sheetModule.outputDestination.address)}`,
    confidence: [...new Set(confidence)],
  };
}

function toSheetView(value: string | number | boolean | null): BlueprintSheetView {
  const name = typeof value === "string" ? value : value === null ? null : String(value);
  return {
    name,
    displayName: name === null ? "<thiếu sheetId>" : JSON.stringify(name),
    whitespaceSignificant: name !== null && name !== name.trim(),
  };
}

function uniqueSheets(sheets: BlueprintSheetView[]): BlueprintSheetView[] {
  const seen = new Set<string>();
  return sheets.filter((sheet) => {
    const key = sheet.name === null ? "__missing__" : sheet.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatSheetName(value: string | number | boolean | null): string {
  return toSheetView(value).displayName;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "<undefined>";
  return JSON.stringify(value);
}

const matrixConflictTranslations: Record<number, string[]> = {
  1: [
    "Matrix nói Antigravity ghi Setup!A2:J2; scenario chỉ đọc Setup!A2:J2 đến Setup!A5:J5.",
    "Matrix coi Sitemap!A2:A là đầu ra; Blueprint ghi Sitemap!D3:D200 và Sitemap-Working!A1, A3, A5, A7.",
    "Matrix khai báo callback Antigravity; Blueprint không có module HTTP hoặc webhook-response.",
  ],
  2: [
    "Mapping đầu vào Sitemap!A2:A và đầu ra Sitemap Keywords!A2:D trong Matrix không tồn tại trong Blueprint.",
    "Blueprint đọc các biến thể Sitemap tại D4:D và cập nhật dòng trên các tab Keywords tương ứng.",
    "Bốn module xóa vùng thiếu sheetId nên chưa thể chứng minh tab đích từ JSON.",
  ],
  3: [
    "Các sheet Seed Keywords!A2:A và ICN Keywords!A2:E trong Matrix không xuất hiện trong Blueprint.",
    "Blueprint xóa/ghi A1, A3, A5 trên bốn biến thể Keyword Research (Working) và đọc Setup hàng 2–5.",
  ],
  4: [
    "Matrix nói Antigravity append Imported Keywords!A2:D và dùng vùng đó làm đầu ra.",
    "Blueprint chỉ đọc Imported Keywords!A2:B rồi xóa/ghi Keyword Research (Working)!A7; không có module append.",
  ],
  5: [
    "Selected Keywords!A2:A và đầu ra On-Page SEO!A2:D trong Matrix không khớp Blueprint; Selected Keywords không tồn tại.",
    "Blueprint đọc các biến thể On-Page SEO tại A2:F, xóa vùng C:F động và ghi values.2 đến values.5 vào dòng tương ứng.",
    "Bốn module xóa vùng thiếu sheetId nên tab đích vẫn cần xác minh.",
  ],
  6: [
    "Matrix nói Antigravity ghi Setup!E2 và đầu ra Home Page!A2:D.",
    "Blueprint không ghi Setup; nó đọc Setup hàng 2–5 và chỉ ghi ô A2 trên bốn biến thể Home Page.",
  ],
  7: [
    "On-Page SEO!A2:D và Content Headline!A2:C trong Matrix không phải mapping Blueprint; Content Headline không phải tên sheet được tham chiếu.",
    "Blueprint đọc Setup/các biến thể On-Page SEO, xóa I:J động và ghi values.8, values.9 trở lại On-Page SEO.",
    "Bốn module xóa vùng thiếu sheetId nên tab đích vẫn cần xác minh.",
  ],
  8: [
    "Content Headline!A2:C và Content Intro!A2:C trong Matrix đều không xuất hiện như sheet trong Blueprint.",
    "Blueprint đọc Setup/các biến thể On-Page SEO, xóa ô K động và ghi values.10 trở lại On-Page SEO.",
    "Bốn module xóa vùng thiếu sheetId nên tab đích vẫn cần xác minh.",
  ],
  10: [
    "Content Intro!A2:C và Content Sections!A2:E trong Matrix đều không xuất hiện như sheet trong Blueprint.",
    "Blueprint đọc Setup/các biến thể On-Page SEO, xóa M:S động rồi ghi các ô M đến S trở lại các tab đó.",
    "Bốn module xóa vùng thiếu sheetId nên tab đích vẫn cần xác minh.",
  ],
  12: [
    "Matrix coi Upload Status!A2:D là đầu ra; Blueprint không ghi Google Sheet và không tham chiếu sheet Upload Status.",
    "Blueprint đọc On-Page SEO!A2:Z500 rồi tạo bài WordPress publish/draft; không có module Facebook dù tên scenario có Facebook.",
    "Matrix khai báo callback và các field lưu trạng thái từ xa; Blueprint không mã hóa các hành vi đó.",
  ],
};

const anomalyTranslations: Record<number, string[]> = {
  3: [
    "Module 41 ghi Keyword Research (Working)!A3 trong route mà các module còn lại dùng tab có khoảng trắng đầu tên \" Keyword Research(Working) 1\".",
  ],
  5: [
    "Module 50 ghi On-Page SEO trong khi route đọc tab có khoảng trắng đầu \" On-Page SEO 1\" bằng module 42.",
    "Module 52 dùng số hàng của module đọc Setup 41 thay vì số hàng của module On-Page SEO 42.",
    "Module 62 dùng số hàng của module đọc Setup 53 thay vì số hàng của module On-Page SEO 54.",
  ],
  7: [
    "Route Setup hàng 4 đọc \" On-Page SEO 1\" bằng module 31, nhưng module 36/38 đọc-ghi On-Page SEO 2 bằng số hàng của module 31.",
  ],
  8: [
    "Module 23 ghi On-Page SEO 3 bằng số hàng được module 19 đọc từ On-Page SEO 2.",
  ],
};
