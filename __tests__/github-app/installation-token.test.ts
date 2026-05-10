import { describe, expect, it, vi } from "vitest";
import { createInstallationAccessToken } from "../../src/github-app/installation-token";

describe("createInstallationAccessToken", () => {
  it("requests installation then access token with a flat repositories array", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({ id: 42 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({
          token: "ghs_xxx",
          expires_at: "2099-01-01T00:00:00Z",
        }),
      });

    const result = await createInstallationAccessToken({
      owner: "acme",
      repository: "app-repo",
      jwt: "jwt-value",
      repositories: ["app-repo", "other-repo"],
      permissions: { contents: "read" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({
      token: "ghs_xxx",
      expiresAt: "2099-01-01T00:00:00Z",
      installationId: 42,
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/acme/app-repo/installation",
      expect.any(Object),
    );

    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
    const tokenCall = fetchImpl.mock.calls[1];
    if (!tokenCall) {
      throw new Error("expected access_tokens fetch");
    }
    expect(tokenCall[0]).toBe(
      "https://api.github.com/app/installations/42/access_tokens",
    );
    const tokenBody = JSON.parse((tokenCall[1] as RequestInit).body as string);
    expect(tokenBody.repositories).toEqual(["app-repo", "other-repo"]);
    expect(tokenBody.permissions).toEqual({ contents: "read" });
  });

  it("throws when installation lookup fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "nope",
      json: async () => ({}),
    });

    await expect(
      createInstallationAccessToken({
        owner: "a",
        repository: "b",
        jwt: "j",
        repositories: ["b"],
        permissions: undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Failed to get installation: 404 nope");
  });
});
