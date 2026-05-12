import { describe, expect, it, vi } from "vitest";
import { signWithKms } from "../src/google-cloud/kms-sign-sdk";

const kmsMock = vi.hoisted(() => ({
  asymmetricSign: vi.fn(),
}));

vi.mock("@google-cloud/kms", () => ({
  KeyManagementServiceClient: class {
    // noinspection JSUnusedGlobalSymbols Intended for mock test
    asymmetricSign = kmsMock.asymmetricSign;
  },
}));

describe("kms-sign-sdk.ts", () => {
  describe("signWithKms", () => {
    it("returns full JWT with base64url signature", async () => {
      const sigBytes = Buffer.from("signature bytes");
      kmsMock.asymmetricSign.mockResolvedValue([{ signature: sigBytes }]);

      const jwt = await signWithKms("projects/p/.../key/1", "header.payload");
      expect(jwt).toBe(`header.payload.${sigBytes.toString("base64url")}`);
    });

    it("throws when signature is missing", async () => {
      kmsMock.asymmetricSign.mockResolvedValue([{ signature: null }]);

      await expect(signWithKms("key", "header.payload")).rejects.toThrow(
        "No signature in KMS response",
      );
    });
  });
});
