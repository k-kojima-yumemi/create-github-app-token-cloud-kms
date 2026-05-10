export function tokenExpiresIn(expiresAt: string): number {
  const now = new Date();
  const expiresAtDate = new Date(expiresAt);
  return Math.round((expiresAtDate.getTime() - now.getTime()) / 1000);
}

export async function revokeInstallationToken(
  token: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<void> {
  const res = await fetchImpl("https://api.github.com/installation/token", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to revoke token: ${res.status} ${await res.text()}`,
    );
  }
}
