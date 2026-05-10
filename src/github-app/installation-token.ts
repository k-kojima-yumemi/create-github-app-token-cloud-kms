import type {
  GitHubInstallationResponse,
  GitHubScopedAccessTokenResponse,
} from "../schema";

const githubHeadersBase = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

export async function createInstallationAccessToken(options: {
  owner: string;
  repository: string;
  jwt: string;
  repositories: string[];
  permissions: Record<string, string> | undefined;
  fetchImpl?: typeof fetch;
}): Promise<{
  token: string;
  expiresAt: string;
  installationId: number;
}> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const jwtHeaders = {
    ...githubHeadersBase,
    Authorization: `Bearer ${options.jwt}`,
  };

  const installRes = await fetchImpl(
    `https://api.github.com/repos/${options.owner}/${options.repository}/installation`,
    { headers: jwtHeaders },
  );
  if (!installRes.ok) {
    throw new Error(
      `Failed to get installation: ${installRes.status} ${await installRes.text()}`,
    );
  }
  const { id: installationId } =
    (await installRes.json()) as GitHubInstallationResponse;

  const tokenRes = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: jwtHeaders,
      body: JSON.stringify({
        repositories: options.repositories,
        permissions: options.permissions,
      }),
    },
  );
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to create token: ${tokenRes.status} ${await tokenRes.text()}`,
    );
  }
  const { token, expires_at: expiresAt } =
    (await tokenRes.json()) as GitHubScopedAccessTokenResponse;
  return { token, expiresAt, installationId };
}
