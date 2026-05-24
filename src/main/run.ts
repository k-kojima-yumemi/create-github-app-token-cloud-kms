import * as core from "@actions/core";
import { getInstallationAccessToken } from "../github-app/installation-token";
import { buildJwtSigningMessage } from "../github-app/jwt-message";
import { signWithKms } from "../google-cloud/kms-sign-sdk";
import { resolveInputs } from "../inputs";

export async function run(): Promise<void> {
  const inputs = resolveInputs(core.getInput);

  const now = Math.floor(Date.now() / 1000);
  const message = buildJwtSigningMessage(inputs.clientId, now);
  const jwt = await signWithKms(inputs.kmsKeyName, message);
  core.setSecret(jwt);
  core.debug("GitHub App JWT created");

  core.debug(`Installation type: ${inputs.type}`);
  const tokenResult = await getInstallationAccessToken(inputs, jwt);

  core.debug(`Installation ID: ${tokenResult.installationId}`);

  core.setSecret(tokenResult.token);
  core.setOutput("token", tokenResult.token);
  core.saveState("token", tokenResult.token);
  core.saveState("expiresAt", tokenResult.expiresAt);
}
