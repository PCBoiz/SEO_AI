import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/app-error";
import { parseUpdateWorkspaceInput } from "@/domain/workspaces/workspace";

describe("workspace settings validation", () => {
  it("normalizes a valid workspace name and slug", () => {
    expect(
      parseUpdateWorkspaceInput({
        name: "  Antigravity Local  ",
        slug: "antigravity-local",
      }),
    ).toEqual({ name: "Antigravity Local", slug: "antigravity-local" });
  });

  it("rejects unsafe or ambiguous slugs", () => {
    expect(() =>
      parseUpdateWorkspaceInput({ name: "Workspace", slug: "Invalid Slug" }),
    ).toThrow(ValidationError);
    expect(() =>
      parseUpdateWorkspaceInput({ name: "Workspace", slug: "double--hyphen" }),
    ).toThrow(ValidationError);
  });
});
