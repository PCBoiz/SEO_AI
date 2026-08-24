import { describe, expect, it } from "vitest";
import {
  assertRolePermission,
  roleHasPermission,
} from "@/domain/auth/permissions";
import { AuthorizationError } from "@/domain/shared/app-error";

describe("workspace role permissions", () => {
  it("allows owners to manage members and secrets", () => {
    expect(roleHasPermission("owner", "workspace.members.manage")).toBe(true);
    expect(roleHasPermission("owner", "workspace.secrets.manage")).toBe(true);
  });

  it("allows editors to work but not manage owners or master secrets", () => {
    expect(roleHasPermission("editor", "project.update")).toBe(true);
    expect(roleHasPermission("editor", "pipeline.run")).toBe(true);
    expect(roleHasPermission("editor", "output.publish")).toBe(true);
    expect(roleHasPermission("editor", "workspace.members.manage")).toBe(false);
    expect(roleHasPermission("editor", "workspace.secrets.manage")).toBe(false);
  });

  it("keeps viewers read-only", () => {
    expect(roleHasPermission("viewer", "workspace.read")).toBe(true);
    expect(roleHasPermission("viewer", "project.update")).toBe(false);
    expect(() => assertRolePermission("viewer", "job.retry")).toThrow(
      AuthorizationError,
    );
  });
});
