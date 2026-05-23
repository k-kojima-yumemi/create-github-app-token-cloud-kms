import { getInput } from "../actions-wrapper/core";
import { debug } from "../actions-wrapper/log";
import { saveState, setOutput, setSecret } from "../actions-wrapper/set";
import { buildJwtSigningMessage } from "../github-app/jwt-message";
import { createOwnerInstallationAccessToken } from "../github-app/owner-installation-token";
import { createRepoInstallationAccessToken } from "../github-app/repo-installation-token";
import { signJwtWithKms } from "../google-cloud/kms-sign-fetch";
import { resolveGoogleCloudAccessToken } from "../google-cloud/resolve-access-token";
import { type ResolvedInputs, resolveInputs } from "../inputs";

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

  const tokenResult = await getToken(inputs, jwt);

  debug(`Installation ID: ${tokenResult.installationId}`);
  debug(`Token expires at: ${tokenResult.expiresAt}`);

  setSecret(tokenResult.token);
  setOutput("token", tokenResult.token);
  saveState("token", tokenResult.token);
  saveState("expiresAt", tokenResult.expiresAt);
}

async function getToken(inputs: ResolvedInputs, jwt: string) {
  debug(`Installation type: ${inputs.type}`);
  if (inputs.type === "repo") {
    if (inputs.repositories.length === 0) {
      throw new Error("At least one repository is required");
    }
    return createRepoInstallationAccessToken({
      owner: inputs.owner,
      jwt,
      repositories: inputs.repositories,
      permissions: inputs.permissions,
    });
  }
  return createOwnerInstallationAccessToken({
    owner: inputs.owner,
    jwt,
    permissions: inputs.permissions,
  });
}
