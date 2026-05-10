import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../../src/minimal/run";

const logMock = vi.hoisted(() => ({
  debug: vi.fn(),
}));

vi.mock("../../src/actions-wrapper/log", () => logMock);

const setMock = vi.hoisted(() => ({
  saveState: vi.fn(),
  setOutput: vi.fn(),
  setSecret: vi.fn(),
}));

vi.mock("../../src/actions-wrapper/set", () => setMock);

const resolveInputsMock = vi.hoisted(() =>
  vi.fn(() => ({
    clientId: "Iv1.app",
    kmsKeyName: "projects/p/locations/l/keyRings/r/cryptoKeys/k",
    owner: "acme",
    repositories: ["svc"],
    permissions: undefined as Record<string, string> | undefined,
  })),
);

vi.mock("../../src/inputs", () => ({
  resolveInputs: resolveInputsMock,
}));

const resolveGcMock = vi.hoisted(() => vi.fn(async () => "gcp-access"));

vi.mock("../../src/google-cloud/resolve-access-token", () => ({
  resolveGoogleCloudAccessToken: resolveGcMock,
}));

const buildJwtMock = vi.hoisted(() => vi.fn(() => "unsigned.jwt"));

vi.mock("../../src/github-app/jwt-message", () => ({
  buildJwtSigningMessage: buildJwtMock,
}));

const signKmsMock = vi.hoisted(() => vi.fn(async () => "signed.jwt.token"));

vi.mock("../../src/google-cloud/kms-sign-fetch", () => ({
  signJwtWithKms: signKmsMock,
}));

const installationTokenMock = vi.hoisted(() =>
  vi.fn(async () => ({
    token: "ghs_installation",
    expiresAt: "2030-01-01T00:00:00Z",
    installationId: 99,
  })),
);

vi.mock("../../src/github-app/installation-token", () => ({
  createInstallationAccessToken: installationTokenMock,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("run", () => {
  it("wires inputs through KMS signing and GitHub token creation", async () => {
    await run(1_800_000_000);

    expect(resolveInputsMock).toHaveBeenCalledOnce();
    expect(resolveGcMock).toHaveBeenCalledOnce();
    expect(buildJwtMock).toHaveBeenCalledWith("Iv1.app", 1_800_000_000);
    expect(signKmsMock).toHaveBeenCalledWith({
      kmsKeyName: "projects/p/locations/l/keyRings/r/cryptoKeys/k",
      message: "unsigned.jwt",
      accessToken: "gcp-access",
    });
    expect(installationTokenMock).toHaveBeenCalledWith({
      owner: "acme",
      repository: "svc",
      jwt: "signed.jwt.token",
      repositories: ["svc"],
      permissions: undefined,
    });

    expect(setMock.setSecret).toHaveBeenCalledWith("ghs_installation");
    expect(setMock.setOutput).toHaveBeenCalledWith("token", "ghs_installation");
    expect(setMock.saveState).toHaveBeenCalledWith("token", "ghs_installation");
    expect(setMock.saveState).toHaveBeenCalledWith(
      "expiresAt",
      "2030-01-01T00:00:00Z",
    );
  });
});
