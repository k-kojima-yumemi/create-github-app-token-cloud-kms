import type { ResolvedInputs } from "../inputs";
import { createOwnerInstallationAccessToken } from "./owner-installation-token";
import { createRepoInstallationAccessToken } from "./repo-installation-token";

export type TokenResult = {
  token: string;
  expiresAt: string;
  installationId: number;
};

export async function getInstallationAccessToken(
  inputs: ResolvedInputs,
  jwt: string,
): Promise<TokenResult> {
  switch (inputs.type) {
    case "repo":
      if (inputs.repositories.length === 0) {
        throw new Error("At least one repository is required");
      }
      return createRepoInstallationAccessToken({
        owner: inputs.owner,
        jwt,
        repositories: inputs.repositories,
        permissions: inputs.permissions,
      });
    case "owner":
      return createOwnerInstallationAccessToken({
        owner: inputs.owner,
        jwt,
        permissions: inputs.permissions,
      });
    default:
      throw new Error(
        `Unsupported installation type: ${inputs satisfies never}`,
      );
  }
}
