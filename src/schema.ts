export type GitHubOidcTokenResponse = {
  value: string;
};

export type GitHubInstallationResponse = {
  id: number;
};

export type GitHubScopedAccessTokenResponse = {
  token: string;
  expires_at: string;
};

export type GoogleCloudAccessTokenResponse = {
  access_token: string;
};

export type KmsSignatureResponse = {
  signature: string;
};
