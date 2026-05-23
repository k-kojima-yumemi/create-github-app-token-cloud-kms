import type {
  GitHubInstallationResponse,
  GitHubScopedAccessTokenResponse,
} from "../schema";

const githubHeadersBase = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

async function getOwnerInstallationId(
  owner: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<number> {
  const orgRes = await fetchImpl(
    `https://api.github.com/orgs/${owner}/installation`,
    { headers },
  );
  if (orgRes.ok) {
    const { id } = (await orgRes.json()) as GitHubInstallationResponse;
    return id;
  }
  const userRes = await fetchImpl(
    `https://api.github.com/users/${owner}/installation`,
    { headers },
  );
  if (!userRes.ok) {
    throw new Error(
      `Failed to get installation: ${userRes.status} ${await userRes.text()}`,
    );
  }
  const { id } = (await userRes.json()) as GitHubInstallationResponse;
  return id;
}

type TokenResult = {
  token: string;
  expiresAt: string;
  installationId: number;
};

export async function createOwnerInstallationAccessToken(options: {
  owner: string;
  jwt: string;
  permissions: Record<string, string> | undefined;
  fetchImpl?: typeof fetch;
}): Promise<TokenResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const jwtHeaders = {
    ...githubHeadersBase,
    Authorization: `Bearer ${options.jwt}`,
  };

  const installationId = await getOwnerInstallationId(
    options.owner,
    jwtHeaders,
    fetchImpl,
  );

  const tokenRes = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: jwtHeaders,
      body: JSON.stringify({ permissions: options.permissions }),
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
