import * as core from "@actions/core";
import { resolveInputs } from "../../src/inputs";
import type {
  GitHubInstallationResponse,
  GitHubOidcTokenResponse,
  GitHubScopedAccessTokenResponse,
  GoogleCloudAccessTokenResponse,
  KmsSignatureResponse,
} from "./schema";
import { createHash } from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is required`);
  return value;
}

async function main(): Promise<void> {
  // Get input and token for Google Cloud
  const commonInputs = resolveInputs();
  const googleCloudAccessToken = await resolveGoogleCloudAccessToken();

  // Create JWT message
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 180,
      iss: commonInputs.clientId,
    }),
  ).toString("base64url");
  const message = `${header}.${payload}`;

  // Sign JWT with KMS
  const digest = createHash("sha256").update(message).digest("base64");
  const kmsRes = await fetch(
    `https://cloudkms.googleapis.com/v1/${commonInputs.kmsKeyName}:asymmetricSign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleCloudAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ digest: { sha256: digest } }),
    },
  );
  if (!kmsRes.ok)
    throw new Error(
      `Failed to sign with KMS: ${kmsRes.status} ${await kmsRes.text()}`,
    );
  const { signature } = (await kmsRes.json()) as KmsSignatureResponse;
  const jwt = `${message}.${Buffer.from(signature, "base64").toString("base64url")}`;

  // Get installation ID
  const githubHeaders = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const jwtHeaders = { ...githubHeaders, Authorization: `Bearer ${jwt}` };
  const installRes = await fetch(
    `https://api.github.com/repos/${commonInputs.owner}/${commonInputs.repositories[0]}/installation`,
    { headers: jwtHeaders },
  );
  if (!installRes.ok)
    throw new Error(
      `Failed to get installation: ${installRes.status} ${await installRes.text()}`,
    );
  const { id: installationId } =
    (await installRes.json()) as GitHubInstallationResponse;
  core.debug(`Installation ID: ${installationId}`);

  // Get scoped access token
  const tokenRes = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: jwtHeaders,
      body: JSON.stringify({
        repositories: [commonInputs.repositories],
        permissions: commonInputs.permissions,
      }),
    },
  );
  if (!tokenRes.ok)
    throw new Error(
      `Failed to create token: ${tokenRes.status} ${await tokenRes.text()}`,
    );
  const { token, expires_at: expiresAt } =
    (await tokenRes.json()) as GitHubScopedAccessTokenResponse;
  core.debug(`Token expires at: ${expiresAt}`);

  core.setSecret(token);
  core.setOutput("token", token);
  core.saveState("token", token);
  core.saveState("expiresAt", expiresAt);
}

async function resolveGoogleCloudAccessToken(): Promise<string> {
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
    const oidcRes = await fetch(
      `${requireEnv("ACTIONS_ID_TOKEN_REQUEST_URL")}&audience=${encodeURIComponent(`https://iam.googleapis.com/${workloadIdentityProvider}`)}`,
      {
        headers: {
          Authorization: `bearer ${requireEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN")}`,
        },
      },
    );
    if (!oidcRes.ok)
      throw new Error(
        `Failed to get OIDC token: ${oidcRes.status} ${await oidcRes.text()}`,
      );
    const { value: oidcToken } =
      (await oidcRes.json()) as GitHubOidcTokenResponse;

    const stsRes = await fetch("https://sts.googleapis.com/v1/token", {
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
    if (!stsRes.ok)
      throw new Error(
        `Failed to exchange token: ${stsRes.status} ${await stsRes.text()}`,
      );

    const { access_token } =
      (await stsRes.json()) as GoogleCloudAccessTokenResponse;
    return access_token;
  }
  throw new Error("No Google Cloud access token provided");
}

main().catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error);
  }
});
