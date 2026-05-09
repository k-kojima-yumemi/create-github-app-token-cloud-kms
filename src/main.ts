import * as core from "@actions/core";
import { createInstallationToken, getInstallationId } from "./github";
import { buildJwtMessage, signWithKms } from "./kms";

export async function run(): Promise<void> {
  try {
    const appId = core.getInput("app-id", { required: true });
    const kmsKeyName = core.getInput("kms-key-name", { required: true });
    const repository = process.env["GITHUB_REPOSITORY"];
    if (!repository) throw new Error("GITHUB_REPOSITORY is not set");
    const repo = repository.split("/")[1];
    if (!repo) throw new Error("Invalid GITHUB_REPOSITORY format");

    const message = buildJwtMessage(appId);
    const jwt = await signWithKms(kmsKeyName, message);
    core.debug("GitHub App JWT created");

    const installationId = await getInstallationId(repository, jwt);
    core.debug(`Installation ID: ${installationId}`);

    const { token, expiresAt } = await createInstallationToken(
      installationId,
      jwt,
      [repo]
    );

    core.setSecret(token);
    core.setOutput("token", token);
    core.setOutput("expires-at", expiresAt);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}
