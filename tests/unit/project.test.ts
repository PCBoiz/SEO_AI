import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/app-error";
import { parseCreateProjectInput } from "@/domain/projects/project";

const validProject = {
  name: "  Acme SEO  ",
  website: "https://example.com/",
  language: "English",
  tone: "Professional",
};

describe("project aggregate input", () => {
  it("normalizes project URLs and competitor domains", () => {
    const input = parseCreateProjectInput({
      ...validProject,
      competitors: [
        { domain: "HTTPS://Competitor.COM/path", priority: 3 },
      ],
    });

    expect(input.name).toBe("Acme SEO");
    expect(input.website).toBe("https://example.com");
    expect(input.competitors).toEqual([
      { domain: "competitor.com", priority: 3 },
    ]);
  });

  it("rejects duplicate normalized competitor domains", () => {
    expect(() =>
      parseCreateProjectInput({
        ...validProject,
        competitors: [
          { domain: "competitor.com", priority: 0 },
          { domain: "https://competitor.com/about", priority: 1 },
        ],
      }),
    ).toThrow(ValidationError);
  });

  it("rejects non-http URLs and incomplete WordPress credentials", () => {
    expect(() =>
      parseCreateProjectInput({ ...validProject, website: "ftp://example.com" }),
    ).toThrow(ValidationError);

    expect(() =>
      parseCreateProjectInput({
        ...validProject,
        wordpress: { url: "https://blog.example.com", username: "editor" },
      }),
    ).toThrow(ValidationError);
  });
});
