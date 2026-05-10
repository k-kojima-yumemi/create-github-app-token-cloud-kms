import * as core from "@actions/core";
import { requireEnv } from "../require-env";
import type {
  GitHubOidcTokenResponse,
  GoogleCloudAccessTokenResponse,
} from "../schema";

export async function resolveGoogleCloudAccessToken(options?: {
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;

  const fromInput = core.getInput("google-cloud-access-token", {
    required: false,
  });
  if (fromInput) {
    return fromInput;
  }

  const workloadIdentityProvider = core.getInput("workload_identity_provider", {
    required: false,
  });
  if (workloadIdentityProvider) {
    const oidcRes = await fetchImpl(
      `${requireEnv("ACTIONS_ID_TOKEN_REQUEST_URL")}&audience=${encodeURIComponent(`https://iam.googleapis.com/${workloadIdentityProvider}`)}`,
      {
        headers: {
          Authorization: `bearer ${requireEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN")}`,
        },
      },
    );
    if (!oidcRes.ok) {
      throw new Error(
        `Failed to get OIDC token: ${oidcRes.status} ${await oidcRes.text()}`,
      );
    }
    const { value: oidcToken } =
      (await oidcRes.json()) as GitHubOidcTokenResponse;

    const stsRes = await fetchImpl("https://sts.googleapis.com/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        audience: `//iam.googleapis.com/${workloadIdentityProvider}`,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        subject_token: oidcToken,
        requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      }),
    });
    if (!stsRes.ok) {
      throw new Error(
        `Failed to exchange token: ${stsRes.status} ${await stsRes.text()}`,
      );
    }

    const { access_token } =
      (await stsRes.json()) as GoogleCloudAccessTokenResponse;
    return access_token;
  }

  throw new Error("No Google Cloud access token provided");
}
