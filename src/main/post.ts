import * as core from "@actions/core";
import {
  revokeInstallationToken,
  tokenExpiresIn,
} from "../github-app/revoke-installation-token";

export async function post(): Promise<void> {
  const token = core.getState("token");
  if (!token) {
    core.debug("No token to revoke");
    return;
  }
  const expiresAt = core.getState("expiresAt");
  if (expiresAt && tokenExpiresIn(expiresAt) < 0) {
    core.info("Token expired, skipping token revocation");
    return;
  }

  try {
    await revokeInstallationToken(token);
    core.info("Token revoked");
  } catch (e) {
    core.warning(e instanceof Error ? e.message : String(e));
  }
}
