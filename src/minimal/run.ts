import { getInput } from "../actions-wrapper/core";
import { debug } from "../actions-wrapper/log";
import { saveState, setOutput, setSecret } from "../actions-wrapper/set";
import { getInstallationAccessToken } from "../github-app/installation-token";
import { buildJwtSigningMessage } from "../github-app/jwt-message";
import { signJwtWithKms } from "../google-cloud/kms-sign-fetch";
import { resolveGoogleCloudAccessToken } from "../google-cloud/resolve-access-token";
import { resolveInputs } from "../inputs";

export async function run(nowSeconds?: number): Promise<void> {
  const inputs = resolveInputs(getInput);
  const googleCloudAccessToken = await resolveGoogleCloudAccessToken({
    getInput,
  });
  const quotaProject =
    getInput("quota-project", { required: false }) || undefined;
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const message = buildJwtSigningMessage(inputs.clientId, now);
  const jwt = await signJwtWithKms({
    kmsKeyName: inputs.kmsKeyName,
    message,
    accessToken: googleCloudAccessToken,
    quotaProject,
  });

  debug(`Installation type: ${inputs.type}`);
  const tokenResult = await getInstallationAccessToken(inputs, jwt);

  debug(`Installation ID: ${tokenResult.installationId}`);
  debug(`Token expires at: ${tokenResult.expiresAt}`);

  setSecret(tokenResult.token);
  setOutput("token", tokenResult.token);
  saveState("token", tokenResult.token);
  saveState("expiresAt", tokenResult.expiresAt);
}
