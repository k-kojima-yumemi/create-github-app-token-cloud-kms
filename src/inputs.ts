import * as core from "@actions/core";

export type ResolvedInputs = {
  clientId: string;
  kmsKeyName: string;
  owner: string;
  repositories: string[];
};

export function resolveOwner(repositoriesInput: string): string {
  if (repositoriesInput) {
    const first = repositoriesInput.split(/[\n,]/)[0].trim();
    if (first.includes("/")) return first.split("/")[0];
    const owner = process.env.GITHUB_REPOSITORY_OWNER;
    if (!owner) throw new Error("GITHUB_REPOSITORY_OWNER is not set");
    return owner;
  }
  const githubRepository = process.env.GITHUB_REPOSITORY;
  if (!githubRepository) throw new Error("GITHUB_REPOSITORY is not set");
  return githubRepository.split("/")[0];
}

export function resolveRepositories(repositoriesInput: string): string[] {
  if (repositoriesInput) {
    return repositoriesInput
      .split(/[\n,]/)
      .map((r) => r.trim())
      .map((r) => (r.includes("/") ? r.split("/")[1] : r));
  }
  const githubRepository = process.env.GITHUB_REPOSITORY;
  if (!githubRepository) throw new Error("GITHUB_REPOSITORY is not set");
  return [githubRepository.split("/")[1]];
}

export function resolveInputs(): ResolvedInputs {
  const clientId = core.getInput("client-id", { required: true });
  const kmsKeyName = core.getInput("kms-key-name", { required: true });
  const repositoriesInput = core.getInput("repositories");

  return {
    clientId,
    kmsKeyName,
    owner: resolveOwner(repositoriesInput),
    repositories: resolveRepositories(repositoriesInput),
  };
}
