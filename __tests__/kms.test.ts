import { describe, expect, it, vi } from "vitest";
import { buildJwtMessage, signWithKms } from "../src/kms";

const kmsMock = vi.hoisted(() => ({
  asymmetricSign: vi.fn(),
}));

vi.mock("@google-cloud/kms", () => ({
  KeyManagementServiceClient: vi.fn().mockImplementation(() => kmsMock),
}));

describe("kms.ts", () => {
  describe("buildJwtMessage", () => {
    it("returns header.payload format", () => {
      const message = buildJwtMessage("123456");
      const [rawHeader, rawPayload] = message.split(".");

      const header = JSON.parse(Buffer.from(rawHeader!, "base64url").toString());
      expect(header).toEqual({ alg: "RS256", typ: "JWT" });

      const payload = JSON.parse(
        Buffer.from(rawPayload!, "base64url").toString()
      );
      expect(payload.iss).toBe("123456");
      expect(payload.exp - payload.iat).toBe(240);
    });
  });

  describe("signWithKms", () => {
    it("returns full JWT with base64url signature", async () => {
      const sigBytes = Buffer.from("signature bytes");
      kmsMock.asymmetricSign.mockResolvedValue([{ signature: sigBytes }]);

      const jwt = await signWithKms("projects/p/.../key/1", "header.payload");
      expect(jwt).toBe(
        `header.payload.${sigBytes.toString("base64url")}`
      );
    });

    it("throws when signature is missing", async () => {
      kmsMock.asymmetricSign.mockResolvedValue([{ signature: null }]);

      await expect(
        signWithKms("key", "header.payload")
      ).rejects.toThrow("No signature in KMS response");
    });
  });
});
