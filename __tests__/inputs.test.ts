import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveInputs,
  resolveOwner,
  resolvePermissions,
  resolveRepositories,
} from "../src/inputs";

const KMS_KEY =
  "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1";

afterEach(() => {
  vi.resetAllMocks();
});

describe("resolveOwner", () => {
  it("parses owner from comma-separated owner/repo format", () => {
    expect(resolveOwner("acme/frontend,acme/backend", {})).toBe("acme");
  });

  it("parses owner from newline-separated owner/repo format", () => {
    expect(resolveOwner("acme/frontend\nacme/backend", {})).toBe("acme");
  });

  it("reads GITHUB_REPOSITORY_OWNER when no owner prefix", () => {
    expect(resolveOwner("repo-a", { GITHUB_REPOSITORY_OWNER: "myorg" })).toBe(
      "myorg",
    );
  });

  it("throws when no owner prefix and GITHUB_REPOSITORY_OWNER is not set", () => {
    expect(() => resolveOwner("repo-a", {})).toThrow(
      "GITHUB_REPOSITORY_OWNER is not set",
    );
  });

  it("reads owner from GITHUB_REPOSITORY when input is empty", () => {
    expect(resolveOwner("", { GITHUB_REPOSITORY: "myorg/myrepo" })).toBe(
      "myorg",
    );
  });

  it("throws when input is empty and GITHUB_REPOSITORY is not set", () => {
    expect(() => resolveOwner("", {})).toThrow("GITHUB_REPOSITORY is not set");
  });
});

describe("resolveRepositories", () => {
  it("strips owner prefix from comma-separated owner/repo format", () => {
    expect(resolveRepositories("acme/frontend,acme/backend", {})).toEqual([
      "frontend",
      "backend",
    ]);
  });

  it("strips owner prefix from newline-separated owner/repo format", () => {
    expect(resolveRepositories("acme/frontend\nacme/backend", {})).toEqual([
      "frontend",
      "backend",
    ]);
  });

  it("returns repo names as-is when no owner prefix", () => {
    expect(resolveRepositories("repo-a\nrepo-b", {})).toEqual([
      "repo-a",
      "repo-b",
    ]);
  });

  it("reads repo from GITHUB_REPOSITORY when input is empty", () => {
    expect(
      resolveRepositories("", { GITHUB_REPOSITORY: "myorg/myrepo" }),
    ).toEqual(["myrepo"]);
  });

  it("throws when input is empty and GITHUB_REPOSITORY is not set", () => {
    expect(() => resolveRepositories("", {})).toThrow(
      "GITHUB_REPOSITORY is not set",
    );
  });
});

describe("resolvePermissions", () => {
  it("collects INPUT_PERMISSION-* env vars into a permissions object", () => {
    const result = resolvePermissions({
      INPUT_PERMISSION_CONTENTS: "irrelevant",
      "INPUT_PERMISSION-CONTENTS": "read",
      "INPUT_PERMISSION-ISSUES": "write",
      "INPUT_PERMISSION-PULL-REQUESTS": "read",
      OTHER_VAR: "ignored",
    });

    expect(result).toEqual({
      contents: "read",
      issues: "write",
      pull_requests: "read",
    });
  });

  it("skips empty values", () => {
    const result = resolvePermissions({
      "INPUT_PERMISSION-CONTENTS": "read",
      "INPUT_PERMISSION-ISSUES": "",
    });

    expect(result).toEqual({ contents: "read" });
  });

  it("returns undefined when no permission inputs are set", () => {
    expect(resolvePermissions({})).toBeUndefined();
  });
});

describe("resolveInputs", () => {
  const getInput = (name: string): string => {
    if (name === "client-id") return "Iv1.abc123";
    if (name === "kms-key-name") return KMS_KEY;
    if (name === "repositories") return "";
    throw new Error(`Unexpected input: ${name}`);
  };

  beforeEach(() => {
    vi.stubEnv("GITHUB_REPOSITORY", "myorg/myrepo");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns all resolved fields including permissions when unset", () => {
    const result = resolveInputs(getInput);

    expect(result).toEqual({
      clientId: "Iv1.abc123",
      kmsKeyName: KMS_KEY,
      owner: "myorg",
      repositories: ["myrepo"],
      permissions: undefined,
    });
  });

  it("includes permissions from INPUT_PERMISSION-* env vars", () => {
    vi.stubEnv("INPUT_PERMISSION-CONTENTS", "read");
    vi.stubEnv("INPUT_PERMISSION-ISSUES", "write");

    const result = resolveInputs(getInput);

    expect(result.permissions).toEqual({
      contents: "read",
      issues: "write",
    });
  });
});
