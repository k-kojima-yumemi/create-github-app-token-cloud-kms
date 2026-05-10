import { getInput } from "../actions-wrapper/core";
import { debug } from "../actions-wrapper/log";
import { saveState, setOutput, setSecret } from "../actions-wrapper/set";
import { createInstallationAccessToken } from "../github-app/installation-token";
import { buildJwtSigningMessage } from "../github-app/jwt-message";
import { signJwtWithKms } from "../google-cloud/kms-sign-fetch";
import { resolveGoogleCloudAccessToken } from "../google-cloud/resolve-access-token";
import { resolveInputs } from "../inputs";

export async function run(nowSeconds?: number): Promise<void> {
  const commonInputs = resolveInputs(getInput);
  const googleCloudAccessToken = await resolveGoogleCloudAccessToken({
    getInput,
  });
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
  debug(`Installation ID: ${installationId}`);
  debug(`Token expires at: ${expiresAt}`);

  setSecret(token);
  setOutput("token", token);
  saveState("token", token);
  saveState("expiresAt", expiresAt);
}
