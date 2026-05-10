import { describe, expect, it } from "vitest";
import { buildJwtSigningMessage } from "../../../src/minimal/github-app/jwt-message";

describe("buildJwtSigningMessage", () => {
  it("builds the unsigned JWT message (header.payload)", () => {
    const now = 1_700_000_000;
    const message = buildJwtSigningMessage("Iv1.deadbeef", now);

    const parts = message.split(".");
    expect(parts).toHaveLength(2);
    const payloadB64 = parts[1];
    if (payloadB64 === undefined) {
      throw new Error("expected JWT payload segment");
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as { iat: number; exp: number; iss: string };

    expect(payload.iss).toBe("Iv1.deadbeef");
    expect(payload.iat).toBe(now - 60);
    expect(payload.exp).toBe(now + 120);
  });
});
