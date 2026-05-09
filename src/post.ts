import * as core from "@actions/core";

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

  const res = await fetch("https://api.github.com/installation/token", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.ok) {
    core.debug("Token revoked");
  } else {
    core.warning(`Failed to revoke token: ${res.status} ${await res.text()}`);
  }
}

function tokenExpiresIn(expiresAt: string): number {
  const now = new Date();
  const expiresAtDate = new Date(expiresAt);

  return Math.round((expiresAtDate.getTime() - now.getTime()) / 1000);
}

/* v8 ignore next */
post().catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error);
  }
});
