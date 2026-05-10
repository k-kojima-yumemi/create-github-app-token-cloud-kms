import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveGoogleCloudAccessToken } from "../../src/google-cloud/resolve-access-token";

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("resolveGoogleCloudAccessToken", () => {
  it("returns google-cloud-access-token input when set", async () => {
    const getInput = (name: string) => {
      if (name === "google-cloud-access-token") return "from-input";
      throw new Error(`Unexpected input: ${name}`);
    };

    await expect(resolveGoogleCloudAccessToken({ getInput })).resolves.toBe(
      "from-input",
    );
  });

  it("exchanges OIDC for an access token when workload-identity-provider is set", async () => {
    const getInput = (name: string) => {
      if (name === "google-cloud-access-token") return "";
      if (name === "workload-identity-provider")
        return "projects/1/locations/global/workloadIdentityPools/p/providers/w";
      throw new Error(`Unexpected input: ${name}`);
    };
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", "https://github.example/oidc");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "github-oidc-secret");

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({ value: "oidc-jwt" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({ access_token: "gcp-access" }),
      });

    await expect(
      resolveGoogleCloudAccessToken({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        getInput,
      }),
    ).resolves.toBe("gcp-access");

    const oidcCall = fetchImpl.mock.calls[0];
    if (!oidcCall) {
      throw new Error("expected OIDC fetch");
    }
    const oidcUrl = oidcCall[0] as string;
    expect(oidcUrl.startsWith("https://github.example/oidc&audience=")).toBe(
      true,
    );
    expect(oidcUrl).toContain(
      encodeURIComponent("https://iam.googleapis.com/"),
    );

    const stsCall = fetchImpl.mock.calls[1];
    if (!stsCall) {
      throw new Error("expected STS fetch");
    }
    const stsInit = stsCall[1] as RequestInit;
    expect(stsInit.method).toBe("POST");
    const body = new URLSearchParams(stsInit.body as string);
    expect(body.get("subject_token")).toBe("oidc-jwt");
  });

  it("throws when no token path is configured", async () => {
    const getInput = () => "";

    await expect(resolveGoogleCloudAccessToken({ getInput })).rejects.toThrow(
      "No Google Cloud access token provided",
    );
  });
});
