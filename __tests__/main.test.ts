import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({
  debug: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  setSecret: vi.fn(),
  saveState: vi.fn(),
}));

const inputsMock = vi.hoisted(() => ({
  resolveInputs: vi.fn(),
  resolvePermissions: vi.fn(),
}));

const kmsMock = vi.hoisted(() => ({
  buildJwtMessage: vi.fn<() => string>(),
  signWithKms: vi.fn<() => Promise<string>>(),
}));

const githubMock = vi.hoisted(() => ({
  getInstallationId: vi.fn<() => Promise<number>>(),
  createInstallationToken:
    vi.fn<() => Promise<{ token: string; expiresAt: string }>>(),
}));

vi.mock("@actions/core", () => coreMock);
vi.mock("../src/inputs", () => inputsMock);
vi.mock("../src/kms", () => kmsMock);
vi.mock("../src/github", () => githubMock);

const { run } = await import("../src/main");

describe("main.ts", () => {
  beforeEach(() => {
    inputsMock.resolveInputs.mockReturnValue({
      clientId: "Iv1.abc123",
      kmsKeyName:
        "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1",
      owner: "myorg",
      repositories: ["myrepo"],
    });
    inputsMock.resolvePermissions.mockReturnValue({ contents: "read" });
    kmsMock.buildJwtMessage.mockReturnValue("header.payload");
    kmsMock.signWithKms.mockResolvedValue("header.payload.sig");
    githubMock.getInstallationId.mockResolvedValue(42);
    githubMock.createInstallationToken.mockResolvedValue({
      token: "ghs_token",
      expiresAt: "2024-01-01T00:00:00Z",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("outputs token on success", async () => {
    await run();

    expect(coreMock.setSecret).toHaveBeenCalledWith("ghs_token");
    expect(coreMock.setOutput).toHaveBeenCalledWith("token", "ghs_token");
    expect(coreMock.setFailed).not.toHaveBeenCalled();
  });

  it("saves token and expiresAt to state for post step", async () => {
    await run();

    expect(coreMock.saveState).toHaveBeenCalledWith("token", "ghs_token");
    expect(coreMock.saveState).toHaveBeenCalledWith(
      "expiresAt",
      "2024-01-01T00:00:00Z",
    );
  });

  it("looks up installation by owner and first repository", async () => {
    await run();

    expect(githubMock.getInstallationId).toHaveBeenCalledWith(
      "myorg/myrepo",
      "header.payload.sig",
    );
  });

  it("passes repositories and permissions to createInstallationToken", async () => {
    inputsMock.resolveInputs.mockReturnValue({
      clientId: "Iv1.abc123",
      kmsKeyName: "projects/p/...",
      owner: "acme",
      repositories: ["frontend", "backend"],
    });
    inputsMock.resolvePermissions.mockReturnValue({
      contents: "read",
      issues: "write",
    });

    await run();

    expect(githubMock.createInstallationToken).toHaveBeenCalledWith(
      42,
      "header.payload.sig",
      ["frontend", "backend"],
      { contents: "read", issues: "write" },
    );
  });

  it("passes undefined permissions when no permission inputs are set", async () => {
    inputsMock.resolvePermissions.mockReturnValue(undefined);

    await run();

    expect(githubMock.createInstallationToken).toHaveBeenCalledWith(
      42,
      "header.payload.sig",
      ["myrepo"],
      undefined,
    );
  });

  it("propagates errors thrown by resolveInputs", async () => {
    inputsMock.resolveInputs.mockImplementation(() => {
      throw new Error("GITHUB_REPOSITORY is not set");
    });

    await expect(run()).rejects.toThrow("GITHUB_REPOSITORY is not set");
  });

  it("propagates errors thrown by resolvePermissions", async () => {
    inputsMock.resolvePermissions.mockImplementation(() => {
      throw new Error("At least one permission-* input must be set");
    });

    await expect(run()).rejects.toThrow(
      "At least one permission-* input must be set",
    );
  });
});
