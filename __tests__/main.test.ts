import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/main/run";

const coreMock = vi.hoisted(() => ({
  debug: vi.fn(),
  getInput: vi.fn<(name: string) => string>().mockReturnValue(""),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  setSecret: vi.fn(),
  saveState: vi.fn(),
}));

const inputsMock = vi.hoisted(() => ({
  resolveInputs: vi.fn(),
  resolvePermissions: vi.fn(),
}));

const jwtMock = vi.hoisted(() => ({
  buildJwtSigningMessage: vi.fn<() => string>(),
}));

const kmsMock = vi.hoisted(() => ({
  signWithKms: vi.fn<() => Promise<string>>(),
}));

const githubMock = vi.hoisted(() => ({
  createRepoInstallationAccessToken:
    vi.fn<
      () => Promise<{
        token: string;
        expiresAt: string;
        installationId: number;
      }>
    >(),
  createOwnerInstallationAccessToken:
    vi.fn<
      () => Promise<{
        token: string;
        expiresAt: string;
        installationId: number;
      }>
    >(),
}));

vi.mock("@actions/core", () => coreMock);
vi.mock("../src/inputs", () => inputsMock);
vi.mock("../src/github-app/jwt-message", () => jwtMock);
vi.mock("../src/google-cloud/kms-sign-sdk", () => kmsMock);
vi.mock("../src/github-app/installation-token", () => githubMock);

describe("main.ts", () => {
  beforeEach(() => {
    inputsMock.resolveInputs.mockReturnValue({
      type: "repo",
      clientId: "Iv1.abc123",
      kmsKeyName:
        "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1",
      owner: "myorg",
      repositories: ["myrepo"],
      permissions: { contents: "read" },
    });
    jwtMock.buildJwtSigningMessage.mockReturnValue("header.payload");
    kmsMock.signWithKms.mockResolvedValue("header.payload.sig");
    githubMock.createRepoInstallationAccessToken.mockResolvedValue({
      token: "ghs_token",
      expiresAt: "2024-01-01T00:00:00Z",
      installationId: 42,
    });
    githubMock.createOwnerInstallationAccessToken.mockResolvedValue({
      token: "ghs_token",
      expiresAt: "2024-01-01T00:00:00Z",
      installationId: 42,
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

  it("looks up installation by owner and repositories", async () => {
    await run();

    expect(githubMock.createRepoInstallationAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "myorg",
        repositories: ["myrepo"],
        jwt: "header.payload.sig",
      }),
    );
  });

  it("passes repositories and permissions to createRepoInstallationAccessToken", async () => {
    inputsMock.resolveInputs.mockReturnValue({
      type: "repo",
      clientId: "Iv1.abc123",
      kmsKeyName: "projects/p/...",
      owner: "acme",
      repositories: ["frontend", "backend"],
      permissions: { contents: "read", issues: "write" },
    });

    await run();

    expect(githubMock.createRepoInstallationAccessToken).toHaveBeenCalledWith({
      owner: "acme",
      jwt: "header.payload.sig",
      repositories: ["frontend", "backend"],
      permissions: { contents: "read", issues: "write" },
    });
  });

  it("passes undefined permissions when no permission inputs are set", async () => {
    inputsMock.resolveInputs.mockReturnValue({
      type: "repo",
      clientId: "Iv1.abc123",
      kmsKeyName:
        "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1",
      owner: "myorg",
      repositories: ["myrepo"],
      permissions: undefined,
    });

    await run();

    expect(githubMock.createRepoInstallationAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: undefined }),
    );
  });

  it("calls createOwnerInstallationAccessToken for owner token", async () => {
    inputsMock.resolveInputs.mockReturnValue({
      type: "owner",
      clientId: "Iv1.abc123",
      kmsKeyName:
        "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1",
      owner: "myorg",
      permissions: undefined,
    });

    await run();

    expect(githubMock.createOwnerInstallationAccessToken).toHaveBeenCalledWith({
      owner: "myorg",
      jwt: "header.payload.sig",
      permissions: undefined,
    });
    expect(githubMock.createRepoInstallationAccessToken).not.toHaveBeenCalled();
  });

  it("propagates errors thrown by resolveInputs", async () => {
    inputsMock.resolveInputs.mockImplementation(() => {
      throw new Error("GITHUB_REPOSITORY is not set");
    });

    await expect(run()).rejects.toThrow("GITHUB_REPOSITORY is not set");
  });

  it("propagates errors thrown by resolveInputs with permissions error", async () => {
    inputsMock.resolveInputs.mockImplementation(() => {
      throw new Error("At least one permission-* input must be set");
    });

    await expect(run()).rejects.toThrow(
      "At least one permission-* input must be set",
    );
  });
});
