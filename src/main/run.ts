import * as core from "@actions/core";
import { buildJwtSigningMessage } from "../github-app/jwt-message";
import { createOwnerInstallationAccessToken } from "../github-app/owner-installation-token";
import { createRepoInstallationAccessToken } from "../github-app/repo-installation-token";
import { signWithKms } from "../google-cloud/kms-sign-sdk";
import { type ResolvedInputs, resolveInputs } from "../inputs";

export async function run(): Promise<void> {
  const inputs = resolveInputs(core.getInput);

  const now = Math.floor(Date.now() / 1000);
  const message = buildJwtSigningMessage(inputs.clientId, now);
  const jwt = await signWithKms(inputs.kmsKeyName, message);
  core.setSecret(jwt);
  core.debug("GitHub App JWT created");

  const tokenResult = await getToken(inputs, jwt);

  core.debug(`Installation ID: ${tokenResult.installationId}`);

  core.setSecret(tokenResult.token);
  core.setOutput("token", tokenResult.token);
  core.saveState("token", tokenResult.token);
  core.saveState("expiresAt", tokenResult.expiresAt);
}

async function getToken(inputs: ResolvedInputs, jwt: string) {
  core.debug(`Installation type: ${inputs.type}`);
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
