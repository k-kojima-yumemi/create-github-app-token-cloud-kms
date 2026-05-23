# create-github-app-token-cloud-kms

A GitHub Action that creates a GitHub App installation access token, signing the JWT with a private key stored
in [Google Cloud KMS](https://cloud.google.com/security/products/security-key-management) instead of handling the key
directly.

## Usage

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # required for Workload Identity Federation

    steps:
      - uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}

      - uses: k-kojima-yumemi/create-github-app-token-cloud-kms@v1.2.0
        id: app-token
        with:
          client-id: ${{ secrets.APP_CLIENT_ID }}
          kms-key-name: ${{ secrets.KMS_KEY_NAME }}
          permission-contents: read

      - uses: actions/checkout@v6
        with:
          token: ${{ steps.app-token.outputs.token }}
```

### Accessing multiple repositories

```yaml
- uses: k-kojima-yumemi/create-github-app-token-cloud-kms@v1.2.0
  id: app-token
  with:
    client-id: ${{ secrets.APP_CLIENT_ID }}
    kms-key-name: ${{ secrets.KMS_KEY_NAME }}
    permission-contents: read
    repositories: |
      owner/repo-a
      owner/repo-b
```

## Inputs

| Name           | Required | Description                                                                                                                 |
|----------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `client-id`    | YES      | GitHub App Client ID                                                                                                        |
| `kms-key-name` | YES      | Cloud KMS key version resource name (`projects/.../keyRings/.../cryptoKeys/.../cryptoKeyVersions/...`)                      |
| `repositories` |          | Comma or newline-separated list of repositories. Accepts `owner/repo` or `repo` format. Defaults to the current repository. |
| `permission-*` |          | Permission level to grant. See `action.yml` for the full list.                                                              |

## Outputs

| Name    | Description                          |
|---------|--------------------------------------|
| `token` | GitHub App installation access token |

The token is automatically revoked when the job completes.

## Limitations

- **Repository-scoped tokens only.** This action always creates a token scoped to specific repositories.
  Organization-level or user-level installation tokens are not supported.
- **GitHub.com only.** The API endpoint is hardcoded to `https://api.github.com`. GitHub Enterprise Server is not
  supported.

# create-github-app-token-cloud-kms/minimal

It has fewer dependencies than the original action.
The action gets a Google Cloud access token by itself using a GitHub OIDC token, so `google-github-actions/auth` is not required.

**When to use the minimal action:**

- You are setting up a new Google Cloud project dedicated to this action, with no existing Google Cloud authentication in your CI.
- You want to avoid introducing `google-github-actions/auth` into your workflow at all.

**When to use the original action instead:**

- You are already using `google-github-actions/auth` in your CI. You can reuse the existing authentication and add the KMS key, keeping your workflow simpler.

```yaml
action-test2:
  runs-on: ubuntu-slim
  timeout-minutes: 5
  steps:
    - uses: k-kojima-yumemi/create-github-app-token-cloud-kms/minimal@5054b161cf2a31780158457b016c893e1684bd01 # v1.1.0
      id: create-token
      with:
        client-id: ${{ vars.APP_ID }}
        kms-key-name: ${{ secrets.KMS_KEY_NAME }}
        workload-identity-provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
    - run: |
        curl -sS -H "Authorization: Bearer ${TOKEN}" -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/${repo}/contents/.terraform-version" \
          | jq -r '.content | @base64d'
      env:
        TOKEN: ${{ steps.create-token.outputs.token }}
        repo: ${{ github.repository }}
```

## Inputs

| Name                         | Required | Description                                                                                                                 |
|------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `client-id`                  | YES      | GitHub App Client ID                                                                                                        |
| `kms-key-name`               | YES      | Cloud KMS key version resource name (`projects/.../keyRings/.../cryptoKeys/.../cryptoKeyVersions/...`)                      |
| `repositories`               |          | Comma or newline-separated list of repositories. Accepts `owner/repo` or `repo` format. Defaults to the current repository. |
| `workload-identity-provider` |          | The Workload Identity Provider resource name. Required if no google-cloud-access-token is provided.                         |
| `google-cloud-access-token`  |          | The access token for Google Cloud. Use this input if you already have valid token.                                          |
| `permission-*`               |          | Permission level to grant. See `action.yml` for the full list.                                                              |
