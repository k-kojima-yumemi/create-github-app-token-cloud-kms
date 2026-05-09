import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({
  getInput: vi.fn<() => string>(),
}));

vi.mock("@actions/core", () => coreMock);

const { resolveOwner, resolveRepositories, resolveInputs } = await import(
  "../src/inputs"
);

const KMS_KEY =
  "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1";

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("resolveOwner", () => {
  it("parses owner from owner/repo format", () => {
    expect(resolveOwner("acme/frontend,acme/backend")).toBe("acme");
  });

  it("reads GITHUB_REPOSITORY_OWNER when no owner prefix", () => {
    vi.stubEnv("GITHUB_REPOSITORY_OWNER", "myorg");
    expect(resolveOwner("repo-a")).toBe("myorg");
  });

  it("throws when no owner prefix and GITHUB_REPOSITORY_OWNER is not set", () => {
    expect(() => resolveOwner("repo-a")).toThrow(
      "GITHUB_REPOSITORY_OWNER is not set",
    );
  });

  it("reads owner from GITHUB_REPOSITORY when input is empty", () => {
    vi.stubEnv("GITHUB_REPOSITORY", "myorg/myrepo");
    expect(resolveOwner("")).toBe("myorg");
  });

  it("throws when input is empty and GITHUB_REPOSITORY is not set", () => {
    expect(() => resolveOwner("")).toThrow("GITHUB_REPOSITORY is not set");
  });
});

describe("resolveRepositories", () => {
  it("strips owner prefix from owner/repo format", () => {
    expect(resolveRepositories("acme/frontend,acme/backend")).toEqual([
      "frontend",
      "backend",
    ]);
  });

  it("returns repo names as-is when no owner prefix", () => {
    expect(resolveRepositories("repo-a\nrepo-b")).toEqual(["repo-a", "repo-b"]);
  });

  it("reads repo from GITHUB_REPOSITORY when input is empty", () => {
    vi.stubEnv("GITHUB_REPOSITORY", "myorg/myrepo");
    expect(resolveRepositories("")).toEqual(["myrepo"]);
  });

  it("throws when input is empty and GITHUB_REPOSITORY is not set", () => {
    expect(() => resolveRepositories("")).toThrow(
      "GITHUB_REPOSITORY is not set",
    );
  });
});

describe("resolveInputs", () => {
  beforeEach(() => {
    coreMock.getInput.mockImplementation((name: string) => {
      if (name === "client-id") return "Iv1.abc123";
      if (name === "kms-key-name") return KMS_KEY;
      return "";
    });
    vi.stubEnv("GITHUB_REPOSITORY", "myorg/myrepo");
  });

  it("returns all resolved fields", () => {
    const result = resolveInputs();

    expect(result).toEqual({
      clientId: "Iv1.abc123",
      kmsKeyName: KMS_KEY,
      owner: "myorg",
      repositories: ["myrepo"],
    });
  });
});
