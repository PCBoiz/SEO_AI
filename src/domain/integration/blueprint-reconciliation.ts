export type BlueprintConfidence =
  | "confirmed_from_blueprint"
  | "inferred_from_module_references"
  | "requires_sheet_verification";

export interface BlueprintSheetView {
  name: string | null;
  displayName: string;
  whitespaceSignificant: boolean;
}

export interface BlueprintSheetModuleView {
  moduleId: string;
  makeModule: string;
  operation: string;
  sheet: BlueprintSheetView;
  address: string;
  writeMappings: string[];
  referencedFields: string[];
  outputDestination: string;
  confidence: BlueprintConfidence[];
}

export interface BlueprintSideEffectView {
  moduleId: string;
  module: string;
  status: string;
}

export interface BlueprintScenarioView {
  scenarioNumber: number;
  scenarioName: string;
  sourceFile: string;
  sourceSha256: string;
  moduleCount: number;
  webhook: {
    moduleId: string;
    hookReference: string;
    label: string;
    maxResults: string;
    payloadSchemaDeclared: boolean;
  } | null;
  spreadsheetReference: string;
  spreadsheetRestorePath: string;
  googleSheetModuleCount: number;
  operationCounts: Array<{ operation: string; count: number }>;
  exactSheets: BlueprintSheetView[];
  missingSheetIdCount: number;
  callbackDetected: boolean;
  completionMode: "polling" | "callback" | "unknown";
  matrixConflicts: string[];
  internalAnomalies: string[];
  sheetModules: BlueprintSheetModuleView[];
  sideEffects: BlueprintSideEffectView[];
}

export interface BlueprintReconciliationView {
  schemaVersion: string;
  generatedDate: string;
  status: string;
  bridgeAllowed: boolean;
  stats: {
    scenarios: number;
    makeModules: number;
    googleSheetModules: number;
    missingSheetIds: number;
    callbacks: number;
    internalAnomalies: number;
  };
  scenarios: BlueprintScenarioView[];
  pilotScenarioNumber: number;
}
