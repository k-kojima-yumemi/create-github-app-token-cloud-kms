# create-github-app-token-cloud-kms

A GitHub Action that creates a GitHub App installation access token, signing the JWT with a private key stored in [Google Cloud KMS](https://cloud.google.com/security/products/security-key-management) instead of handling the key directly.

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

      - uses: k-kojima-yumemi/create-github-app-token-cloud-kms@v1.0.0
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
      - uses: k-kojima-yumemi/create-github-app-token-cloud-kms@v1.0.0
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

| Name | Required | Description |
|------|----------|-------------|
| `client-id` | ✅ | GitHub App Client ID |
| `kms-key-name` | ✅ | Cloud KMS key version resource name (`projects/.../keyRings/.../cryptoKeys/.../cryptoKeyVersions/...`) |
| `repositories` | | Comma or newline-separated list of repositories. Accepts `owner/repo` or `repo` format. Defaults to the current repository. |
| `permission-*` | | Permission level to grant. See [`action.yml`](./action.yml) for the full list. |

## Outputs

| Name | Description |
|------|-------------|
| `token` | GitHub App installation access token |

The token is automatically revoked when the job completes.

## Limitations

- **Repository-scoped tokens only.** This action always creates a token scoped to specific repositories. Organization-level or user-level installation tokens are not supported.
- **GitHub.com only.** The API endpoint is hardcoded to `https://api.github.com`. GitHub Enterprise Server is not supported.
