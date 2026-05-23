import type { InputOptions } from "@actions/core";

type CommonInputs = {
  clientId: string;
  kmsKeyName: string;
  owner: string;
  permissions: Record<string, string> | undefined;
};

export type ResolvedInputs =
  | (CommonInputs & { type: "repo"; repositories: string[] })
  | (CommonInputs & { type: "owner" });

export function resolveOwner(
  repositoriesInput: string,
  env: Record<string, string | undefined> = process.env,
): string {
  if (repositoriesInput) {
    const first = repositoriesInput.split(/[\n,]/)[0].trim();
    if (first.includes("/")) return first.split("/")[0];
    const owner = env.GITHUB_REPOSITORY_OWNER;
    if (!owner) throw new Error("GITHUB_REPOSITORY_OWNER is not set");
    return owner;
  }
  const githubRepository = env.GITHUB_REPOSITORY;
  if (!githubRepository) throw new Error("GITHUB_REPOSITORY is not set");
  return githubRepository.split("/")[0];
}

export function resolveRepositories(
  repositoriesInput: string,
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (repositoriesInput) {
    return repositoriesInput
      .split(/[\n,]/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => (r.includes("/") ? r.split("/")[1] : r));
  }
  const githubRepository = env.GITHUB_REPOSITORY;
  if (!githubRepository) throw new Error("GITHUB_REPOSITORY is not set");
  return [githubRepository.split("/")[1]];
}

export function resolvePermissions(
  env: Record<string, string | undefined> = process.env,
): Record<string, string> | undefined {
  const permissions: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("INPUT_PERMISSION-") || !value) continue;
    const name = key
      .slice("INPUT_PERMISSION-".length)
      .toLowerCase()
      .replaceAll("-", "_");
    permissions[name] = value;
  }

  return Object.keys(permissions).length > 0 ? permissions : undefined;
}

export function resolveInputs(
  getInput: (name: string, options?: InputOptions) => string,
): ResolvedInputs {
  const clientId = getInput("client-id", { required: true });
  const kmsKeyName = getInput("kms-key-name", { required: true });
  const ownerInput = getInput("owner");
  const repositoriesInput = getInput("repositories");
  const permissions = resolvePermissions();

  if (ownerInput && !repositoriesInput) {
    return { type: "owner", clientId, kmsKeyName, owner: ownerInput, permissions };
  }

  return {
    type: "repo",
    clientId,
    kmsKeyName,
    owner: ownerInput || resolveOwner(repositoriesInput),
    repositories: resolveRepositories(repositoriesInput),
    permissions,
  };
}
