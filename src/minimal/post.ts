import { getState } from "../actions-wrapper/core";
import { debug, info, warning } from "../actions-wrapper/log";
import {
  revokeInstallationToken,
  tokenExpiresIn,
} from "../github-app/revoke-installation-token";

export async function post(): Promise<void> {
  const token = getState("token");
  if (!token) {
    debug("No token to revoke");
    return;
  }
  const expiresAt = getState("expiresAt");
  if (expiresAt && tokenExpiresIn(expiresAt) < 0) {
    info("Token expired, skipping token revocation");
    return;
  }

  try {
    await revokeInstallationToken(token);
    info("Token revoked");
  } catch (e) {
    warning(e instanceof Error ? e.message : String(e));
  }
}
