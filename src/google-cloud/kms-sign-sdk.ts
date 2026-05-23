import { createHash } from "node:crypto";
import { KeyManagementServiceClient } from "@google-cloud/kms";

export async function signWithKms(
  kmsKeyName: string,
  message: string,
): Promise<string> {
  const kmsProject = kmsKeyName.split("/")[1];
  const kms = new KeyManagementServiceClient({
    projectId: kmsProject,
  });
  const digest = createHash("sha256").update(message).digest();
  const [{ signature }] = await kms.asymmetricSign({
    name: kmsKeyName,
    digest: { sha256: digest },
  });
  if (!signature) throw new Error("No signature in KMS response");
  return `${message}.${Buffer.from(signature).toString("base64url")}`;
}
