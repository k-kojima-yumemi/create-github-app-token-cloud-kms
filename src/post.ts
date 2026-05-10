import { getState } from "./actions-wrapper/core";
import { debug, info, warning } from "./actions-wrapper/log";

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

  const res = await fetch("https://api.github.com/installation/token", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.ok) {
    info("Token revoked");
  } else {
    warning(`Failed to revoke token: ${res.status} ${await res.text()}`);
  }
}

function tokenExpiresIn(expiresAt: string): number {
  const now = new Date();
  const expiresAtDate = new Date(expiresAt);

  return Math.round((expiresAtDate.getTime() - now.getTime()) / 1000);
}
