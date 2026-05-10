import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { signJwtWithKms } from "../../src/google-cloud/kms-sign-fetch";

describe("signJwtWithKms", () => {
  it("returns a complete JWT when KMS responds with a signature", async () => {
    const signatureBytes = Buffer.from("sig-bytes");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
      json: async () => ({
        signature: signatureBytes.toString("base64"),
      }),
    });

    const message = "header.payload";
    const jwt = await signJwtWithKms({
      kmsKeyName: "projects/p/locations/l/keyRings/r/cryptoKeys/k",
      message,
      accessToken: "gcp-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(jwt).toBe(`${message}.${signatureBytes.toString("base64url")}`);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://cloudkms.googleapis.com/v1/projects/p/locations/l/keyRings/r/cryptoKeys/k:asymmetricSign",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer gcp-token",
        }) as Record<string, string>,
      }),
    );

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined;
    if (!init?.body || typeof init.body !== "string") {
      throw new Error("expected JSON body");
    }
    const body = JSON.parse(init.body) as { digest: { sha256: string } };
    const expectedDigest = createHash("sha256")
      .update(message)
      .digest("base64");
    expect(body.digest.sha256).toBe(expectedDigest);
  });

  it("throws when KMS returns an error status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "forbidden",
      json: async () => ({}),
    });

    await expect(
      signJwtWithKms({
        kmsKeyName: "k",
        message: "a.b",
        accessToken: "t",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Failed to sign with KMS: 403 forbidden");
  });
});
