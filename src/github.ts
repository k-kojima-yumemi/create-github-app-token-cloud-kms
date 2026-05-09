function githubHeaders(jwt: string): Record<string, string> {
  return {
    Authorization: `Bearer ${jwt}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getInstallationId(
  repository: string,
  jwt: string,
): Promise<number> {
  const res = await fetch(
    `https://api.github.com/repos/${repository}/installation`,
    { headers: githubHeaders(jwt) },
  );
  if (!res.ok)
    throw new Error(
      `Failed to get installation: ${res.status} ${await res.text()}`,
    );
  const { id } = (await res.json()) as { id: number };
  return id;
}

export async function createInstallationToken(
  installationId: number,
  jwt: string,
  repositories: string[],
  permissions: Record<string, string>,
): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: githubHeaders(jwt),
      body: JSON.stringify({ repositories, permissions }),
    },
  );
  if (!res.ok)
    throw new Error(
      `Failed to create token: ${res.status} ${await res.text()}`,
    );
  const { token, expires_at } = (await res.json()) as {
    token: string;
    expires_at: string;
  };
  return { token, expiresAt: expires_at };
}
