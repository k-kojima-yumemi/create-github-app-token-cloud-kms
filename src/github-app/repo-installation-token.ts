import type {
  GitHubInstallationResponse,
  GitHubScopedAccessTokenResponse,
} from "../schema";
import type { TokenResult } from "./installation-token";

const githubHeadersBase = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

async function getRepoInstallationId(
  owner: string,
  repository: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<number> {
  const res = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repository}/installation`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to get installation: ${res.status} ${await res.text()}`,
    );
  }
  const { id } = (await res.json()) as GitHubInstallationResponse;
  return id;
}

export async function createRepoInstallationAccessToken(options: {
  owner: string;
  jwt: string;
  repositories: string[];
  permissions: Record<string, string> | undefined;
  fetchImpl?: typeof fetch;
}): Promise<TokenResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const jwtHeaders = {
    ...githubHeadersBase,
    Authorization: `Bearer ${options.jwt}`,
  };

  const installationId = await getRepoInstallationId(
    options.owner,
    options.repositories[0] ?? "",
    jwtHeaders,
    fetchImpl,
  );

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
