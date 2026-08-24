import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface SheetModuleEvidence {
  moduleId: number;
  module: string;
  operation: string;
  sheet: {
    name: string | null;
    confidence: string;
  };
}

interface ScenarioEvidence {
  scenarioNumber: number;
  trigger: {
    module: string;
    payloadSchemaDeclared: boolean;
  };
  googleSheetModules: SheetModuleEvidence[];
  nonSheetSideEffects: Array<{
    moduleId: number;
    module: string;
  }>;
  antigravityCallback: {
    detected: boolean;
  };
  completion: {
    mode: string;
  };
  matrixConflicts: string[];
}

interface BlueprintModuleMap {
  schemaVersion: string;
  status: string;
  scope: {
    suppliedBlueprintCount: number;
    additionalBlueprintsExcluded: boolean;
  };
  safety: Record<string, boolean>;
  bridgeActivation: {
    allowed: boolean;
  };
  scenarios: ScenarioEvidence[];
}

async function readModuleMap(): Promise<BlueprintModuleMap> {
  const raw = await readFile(
    path.resolve("docs/integration/blueprint-module-map.json"),
    "utf8",
  );
  return JSON.parse(raw) as BlueprintModuleMap;
}

describe("Blueprint Reconciliation v1 machine map", () => {
  it("covers only the ten authorized scenarios and remains non-activatable", async () => {
    const map = await readModuleMap();

    expect(map.schemaVersion).toBe("1.0.0");
    expect(map.status).toBe("evidence_only_not_approved_for_live_bridge");
    expect(map.scope).toMatchObject({
      suppliedBlueprintCount: 10,
      additionalBlueprintsExcluded: true,
    });
    expect(map.scenarios.map(({ scenarioNumber }) => scenarioNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 10, 12,
    ]);
    expect(map.bridgeActivation.allowed).toBe(false);
    expect(Object.values(map.safety)).toEqual(
      expect.arrayContaining([false]),
    );
    expect(Object.values(map.safety).every((value) => value === false)).toBe(
      true,
    );
  });

  it("preserves the extracted module counts, operations, and uncertainty", async () => {
    const map = await readModuleMap();
    const sheetModules = map.scenarios.flatMap(
      ({ googleSheetModules }) => googleSheetModules,
    );
    const operations = Object.fromEntries(
      ["read", "clear", "update_cell", "update_row"].map((operation) => [
        operation,
        sheetModules.filter((candidate) => candidate.operation === operation)
          .length,
      ]),
    );

    expect(sheetModules).toHaveLength(173);
    expect(operations).toEqual({
      read: 58,
      clear: 33,
      update_cell: 50,
      update_row: 32,
    });
    expect(
      sheetModules.filter(({ sheet }) => sheet.name === null),
    ).toHaveLength(20);
    expect(
      sheetModules
        .filter(({ sheet }) => sheet.name === null)
        .every(
          ({ sheet }) => sheet.confidence === "requires_sheet_verification",
        ),
    ).toBe(true);
    expect(
      new Set(sheetModules.map(({ sheet }) => sheet.name)),
    ).toEqual(
      expect.objectContaining(
        new Set([" On-Page SEO 1", " Keyword Research(Working) 1"]),
      ),
    );
  });

  it("does not invent callbacks, webhook payloads, or completion modes", async () => {
    const map = await readModuleMap();

    expect(
      map.scenarios.every(
        ({ trigger }) =>
          trigger.module === "gateway:CustomWebHook" &&
          trigger.payloadSchemaDeclared === false,
      ),
    ).toBe(true);
    expect(
      map.scenarios.every(
        ({ antigravityCallback }) => antigravityCallback.detected === false,
      ),
    ).toBe(true);
    expect(
      map.scenarios.every(({ completion }) => completion.mode === "unknown"),
    ).toBe(true);
    expect(
      map.scenarios.every(({ matrixConflicts }) => matrixConflicts.length > 0),
    ).toBe(true);
  });

  it("records WordPress as a side effect rather than a Sheet result", async () => {
    const map = await readModuleMap();
    const uploadScenario = map.scenarios.find(
      ({ scenarioNumber }) => scenarioNumber === 12,
    );

    expect(uploadScenario?.googleSheetModules).toHaveLength(1);
    expect(uploadScenario?.nonSheetSideEffects).toEqual([
      expect.objectContaining({ moduleId: 2, module: "wordpress:createPost" }),
      expect.objectContaining({ moduleId: 7, module: "wordpress:createPost" }),
    ]);
  });
});
