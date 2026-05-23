import { describe, expect, it, vi } from "vitest";
import {
  createOwnerInstallationAccessToken,
  createRepoInstallationAccessToken,
} from "../../src/github-app/installation-token";

describe("createRepoInstallationAccessToken", () => {
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

    const result = await createRepoInstallationAccessToken({
      owner: "acme",
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

    const tokenCall = fetchImpl.mock.calls[1];
    if (!tokenCall) throw new Error("expected access_tokens fetch");
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
      createRepoInstallationAccessToken({
        owner: "a",
        jwt: "j",
        repositories: ["b"],
        permissions: undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Failed to get installation: 404 nope");
  });
});

describe("createOwnerInstallationAccessToken", () => {
  it("looks up org installation and omits repositories from token body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({ id: 7 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({
          token: "ghs_owner",
          expires_at: "2099-06-01T00:00:00Z",
        }),
      });

    const result = await createOwnerInstallationAccessToken({
      owner: "myorg",
      jwt: "jwt-value",
      permissions: { contents: "read" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({
      token: "ghs_owner",
      expiresAt: "2099-06-01T00:00:00Z",
      installationId: 7,
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/orgs/myorg/installation",
      expect.any(Object),
    );

    const tokenCall = fetchImpl.mock.calls[1];
    if (!tokenCall) throw new Error("expected access_tokens fetch");
    const tokenBody = JSON.parse((tokenCall[1] as RequestInit).body as string);
    expect(tokenBody.repositories).toBeUndefined();
    expect(tokenBody.permissions).toEqual({ contents: "read" });
  });

  it("falls back to user installation when org lookup returns non-200", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "not an org",
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({ id: 99 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({
          token: "ghs_user",
          expires_at: "2099-06-01T00:00:00Z",
        }),
      });

    const result = await createOwnerInstallationAccessToken({
      owner: "someuser",
      jwt: "jwt-value",
      permissions: undefined,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.token).toBe("ghs_user");
    expect(result.installationId).toBe(99);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/orgs/someuser/installation",
      expect.any(Object),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/users/someuser/installation",
      expect.any(Object),
    );
  });

  it("throws when both org and user lookups fail", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "not found",
      json: async () => ({}),
    });

    await expect(
      createOwnerInstallationAccessToken({
        owner: "nobody",
        jwt: "j",
        permissions: undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Failed to get installation: 404 not found");
  });
});
