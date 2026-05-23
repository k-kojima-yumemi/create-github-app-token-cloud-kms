import { createHash } from "node:crypto";
import type { KmsSignatureResponse } from "../schema";

export async function signJwtWithKms(options: {
  kmsKeyName: string;
  message: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sha256DigestBase64 = createHash("sha256")
    .update(options.message)
    .digest("base64");
  const kmsProject = options.kmsKeyName.split("/")[1];
  const kmsRes = await fetchImpl(
    `https://cloudkms.googleapis.com/v1/${options.kmsKeyName}:asymmetricSign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": kmsProject,
      },
      body: JSON.stringify({
        digest: { sha256: sha256DigestBase64 },
      }),
    },
  );
  if (!kmsRes.ok) {
    throw new Error(
      `Failed to sign with KMS: ${kmsRes.status} ${await kmsRes.text()}`,
    );
  }
  const { signature } = (await kmsRes.json()) as KmsSignatureResponse;
  return `${options.message}.${Buffer.from(signature, "base64").toString("base64url")}`;
}
