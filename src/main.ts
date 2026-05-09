import * as core from "@actions/core";
import { createInstallationToken, getInstallationId } from "./github";
import { resolveInputs, resolvePermissions } from "./inputs";
import { buildJwtMessage, signWithKms } from "./kms";

export async function run(): Promise<void> {
  const { clientId, kmsKeyName, owner, repositories } = resolveInputs();
  const permissions = resolvePermissions();

  const message = buildJwtMessage(clientId);
  const jwt = await signWithKms(kmsKeyName, message);
  core.debug("GitHub App JWT created");

  const installationId = await getInstallationId(
    `${owner}/${repositories[0]}`,
    jwt,
  );
  core.debug(`Installation ID: ${installationId}`);

  const { token, expiresAt } = await createInstallationToken(
    installationId,
    jwt,
    repositories,
    permissions,
  );

  core.setSecret(token);
  core.setOutput("token", token);
  core.saveState("token", token);
  core.saveState("expiresAt", expiresAt);
}
