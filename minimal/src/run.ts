import * as core from "@actions/core";
import { resolveInputs } from "../../src/inputs";
import { createInstallationAccessToken } from "./github-app/installation-token";
import { buildJwtSigningMessage } from "./github-app/jwt-message";
import { signJwtWithKms } from "./google-cloud/kms-sign";
import { resolveGoogleCloudAccessToken } from "./google-cloud/resolve-access-token";

export async function run(nowSeconds?: number): Promise<void> {
  const commonInputs = resolveInputs();
  const googleCloudAccessToken = await resolveGoogleCloudAccessToken();
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const message = buildJwtSigningMessage(commonInputs.clientId, now);
  const jwt = await signJwtWithKms({
    kmsKeyName: commonInputs.kmsKeyName,
    message,
    accessToken: googleCloudAccessToken,
  });
  const primaryRepository = commonInputs.repositories[0];
  if (!primaryRepository) {
    throw new Error("At least one repository is required");
  }
  const { token, expiresAt, installationId } =
    await createInstallationAccessToken({
      owner: commonInputs.owner,
      repository: primaryRepository,
      jwt,
      repositories: commonInputs.repositories,
      permissions: commonInputs.permissions,
    });
  core.debug(`Installation ID: ${installationId}`);
  core.debug(`Token expires at: ${expiresAt}`);

  core.setSecret(token);
  core.setOutput("token", token);
  core.saveState("token", token);
  core.saveState("expiresAt", expiresAt);
}
