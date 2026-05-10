import * as core from "@actions/core";
import { createInstallationToken, getInstallationId } from "./github";
import { resolveInputs } from "./inputs";
import { buildJwtMessage, signWithKms } from "./kms";

export async function run(): Promise<void> {
  const { clientId, kmsKeyName, owner, repositories, permissions } =
    resolveInputs();

  const message = buildJwtMessage(clientId);
  const jwt = await signWithKms(kmsKeyName, message);
  core.setSecret(jwt);
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
