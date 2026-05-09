import { createHash } from "node:crypto";
import { KeyManagementServiceClient } from "@google-cloud/kms";

export function buildJwtMessage(appId: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 180, iss: appId }),
  ).toString("base64url");
  return `${header}.${payload}`;
}

export async function signWithKms(
  kmsKeyName: string,
  message: string,
): Promise<string> {
  const kms = new KeyManagementServiceClient();
  const digest = createHash("sha256").update(message).digest();
  const [{ signature }] = await kms.asymmetricSign({
    name: kmsKeyName,
    digest: { sha256: digest },
  });
  if (!signature) throw new Error("No signature in KMS response");
  return `${message}.${Buffer.from(signature).toString("base64url")}`;
}
