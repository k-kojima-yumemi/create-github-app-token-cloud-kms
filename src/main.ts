import * as core from "@actions/core";
import { createInstallationAccessToken } from "./github-app/installation-token";
import { buildJwtSigningMessage } from "./github-app/jwt-message";
import { signWithKms } from "./google-cloud/kms-sign-sdk";
import { resolveInputs } from "./inputs";

export async function run(): Promise<void> {
  const { clientId, kmsKeyName, owner, repositories, permissions } =
    resolveInputs();

  const now = Math.floor(Date.now() / 1000);
  const message = buildJwtSigningMessage(clientId, now);
  const jwt = await signWithKms(kmsKeyName, message);
  core.setSecret(jwt);
  core.debug("GitHub App JWT created");

  const primaryRepository = repositories[0];
  if (!primaryRepository) {
    throw new Error("At least one repository is required");
  }

  const { token, expiresAt, installationId } =
    await createInstallationAccessToken({
      owner,
      repository: primaryRepository,
      jwt,
      repositories,
      permissions,
    });

  core.debug(`Installation ID: ${installationId}`);

  core.setSecret(token);
  core.setOutput("token", token);
  core.saveState("token", token);
  core.saveState("expiresAt", expiresAt);
}
