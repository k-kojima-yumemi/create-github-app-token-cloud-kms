import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({
  debug: vi.fn(),
  getInput: vi.fn<() => string>(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  setSecret: vi.fn(),
}));

const kmsMock = vi.hoisted(() => ({
  buildJwtMessage: vi.fn<() => string>(),
  signWithKms: vi.fn<() => Promise<string>>(),
}));

const githubMock = vi.hoisted(() => ({
  getInstallationId: vi.fn<() => Promise<number>>(),
  createInstallationToken: vi.fn<
    () => Promise<{ token: string; expiresAt: string }>
  >(),
}));

vi.mock("@actions/core", () => coreMock);
vi.mock("../src/kms", () => kmsMock);
vi.mock("../src/github", () => githubMock);

const { run } = await import("../src/main");

describe("main.ts", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_REPOSITORY", "owner/repo");
    coreMock.getInput.mockImplementation((name: string) => {
      if (name === "app-id") return "123456";
      if (name === "kms-key-name")
        return "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1";
      return "";
    });
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
    vi.unstubAllEnvs();
  });

  it("outputs token and expires-at on success", async () => {
    await run();

    expect(coreMock.setSecret).toHaveBeenCalledWith("ghs_token");
    expect(coreMock.setOutput).toHaveBeenCalledWith("token", "ghs_token");
    expect(coreMock.setOutput).toHaveBeenCalledWith(
      "expires-at",
      "2024-01-01T00:00:00Z",
    );
    expect(coreMock.setFailed).not.toHaveBeenCalled();
  });

  it("passes repo name to createInstallationToken", async () => {
    await run();

    expect(githubMock.createInstallationToken).toHaveBeenCalledWith(
      42,
      "header.payload.sig",
      ["repo"],
    );
  });

  it("calls setFailed on error", async () => {
    kmsMock.signWithKms.mockRejectedValue(new Error("KMS signing failed"));

    await run();

    expect(coreMock.setFailed).toHaveBeenCalledWith("KMS signing failed");
    expect(coreMock.setOutput).not.toHaveBeenCalled();
  });

  it("calls setFailed when GITHUB_REPOSITORY is not set", async () => {
    vi.unstubAllEnvs();

    await run();

    expect(coreMock.setFailed).toHaveBeenCalledWith(
      "GITHUB_REPOSITORY is not set",
    );
  });
});
