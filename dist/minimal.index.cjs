"use strict";

// src/actions-wrapper/command.ts
var import_node_os = require("node:os");
function escapeData(s) {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function issueCommand(command, message) {
  process.stdout.write(`::${command}::${escapeData(message)}${import_node_os.EOL}`);
}

// src/actions-wrapper/log.ts
function debug(message) {
  issueCommand("debug", message);
}
function error(message) {
  issueCommand(
    "error",
    message instanceof Error ? message.toString() : message
  );
}
function setFailed(message) {
  process.exitCode = 1;
  error(message);
}

// src/actions-wrapper/core.ts
function getInput(name, options, env = process.env) {
  const val = env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? "";
  if (options?.required && !val) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  if (options?.trimWhitespace === false) {
    return val;
  }
  return val.trim();
}

// src/actions-wrapper/set.ts
var import_node_fs = require("node:fs");
var import_node_os2 = require("node:os");
function assertSingleLine(value, label) {
  if (/[\r\n]/.test(value)) {
    throw new Error(`${label} must be a single-line string`);
  }
}
function appendEnvFile(envVar, line) {
  const filePath = process.env[envVar];
  if (!filePath) throw new Error(`${envVar} is not set`);
  (0, import_node_fs.appendFileSync)(filePath, line + import_node_os2.EOL, { encoding: "utf8" });
}
function setSecret(secret) {
  assertSingleLine(secret, "secret");
  issueCommand("add-mask", secret);
}
function setOutput(name, value) {
  assertSingleLine(name, "output name");
  assertSingleLine(value, "output value");
  appendEnvFile("GITHUB_OUTPUT", `${name}=${value}`);
}
function saveState(name, value) {
  assertSingleLine(name, "state name");
  assertSingleLine(value, "state value");
  appendEnvFile("GITHUB_STATE", `${name}=${value}`);
}

// src/github-app/jwt-message.ts
var expTime = 120;
function buildJwtSigningMessage(clientId, nowSeconds) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iat: nowSeconds - 60,
      exp: nowSeconds + expTime,
      iss: clientId
    })
  ).toString("base64url");
  return `${header}.${payload}`;
}

// src/github-app/owner-installation-token.ts
var githubHeadersBase = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};
async function getOwnerInstallationId(owner, headers, fetchImpl) {
  const orgRes = await fetchImpl(
    `https://api.github.com/orgs/${owner}/installation`,
    { headers }
  );
  if (orgRes.ok) {
    const { id: id2 } = await orgRes.json();
    return id2;
  }
  const userRes = await fetchImpl(
    `https://api.github.com/users/${owner}/installation`,
    { headers }
  );
  if (!userRes.ok) {
    throw new Error(
      `Failed to get installation: ${userRes.status} ${await userRes.text()}`
    );
  }
  const { id } = await userRes.json();
  return id;
}
async function createOwnerInstallationAccessToken(options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const jwtHeaders = {
    ...githubHeadersBase,
    Authorization: `Bearer ${options.jwt}`
  };
  const installationId = await getOwnerInstallationId(
    options.owner,
    jwtHeaders,
    fetchImpl
  );
  const tokenRes = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: jwtHeaders,
      body: JSON.stringify({ permissions: options.permissions })
    }
  );
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to create token: ${tokenRes.status} ${await tokenRes.text()}`
    );
  }
  const { token, expires_at: expiresAt } = await tokenRes.json();
  return { token, expiresAt, installationId };
}

// src/github-app/repo-installation-token.ts
var githubHeadersBase2 = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};
async function getRepoInstallationId(owner, repository, headers, fetchImpl) {
  const res = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repository}/installation`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to get installation: ${res.status} ${await res.text()}`
    );
  }
  const { id } = await res.json();
  return id;
}
async function createRepoInstallationAccessToken(options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const jwtHeaders = {
    ...githubHeadersBase2,
    Authorization: `Bearer ${options.jwt}`
  };
  const installationId = await getRepoInstallationId(
    options.owner,
    options.repositories[0] ?? "",
    jwtHeaders,
    fetchImpl
  );
  const tokenRes = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: jwtHeaders,
      body: JSON.stringify({
        repositories: options.repositories,
        permissions: options.permissions
      })
    }
  );
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to create token: ${tokenRes.status} ${await tokenRes.text()}`
    );
  }
  const { token, expires_at: expiresAt } = await tokenRes.json();
  return { token, expiresAt, installationId };
}

// src/google-cloud/kms-sign-fetch.ts
var import_node_crypto = require("node:crypto");
async function signJwtWithKms(options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sha256DigestBase64 = (0, import_node_crypto.createHash)("sha256").update(options.message).digest("base64");
  const headers = {
    Authorization: `Bearer ${options.accessToken}`,
    "Content-Type": "application/json"
  };
  if (options.quotaProject) {
    headers["x-goog-user-project"] = options.quotaProject;
  }
  const kmsRes = await fetchImpl(
    `https://cloudkms.googleapis.com/v1/${options.kmsKeyName}:asymmetricSign`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        digest: { sha256: sha256DigestBase64 }
      })
    }
  );
  if (!kmsRes.ok) {
    throw new Error(
      `Failed to sign with KMS: ${kmsRes.status} ${await kmsRes.text()}`
    );
  }
  const { signature } = await kmsRes.json();
  return `${options.message}.${Buffer.from(signature, "base64").toString("base64url")}`;
}

// src/minimal/require-env.ts
function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`Environment variable ${name} is required`);
  return value;
}

// src/google-cloud/resolve-access-token.ts
async function resolveGoogleCloudAccessToken(options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const { getInput: getInput2 } = options;
  const fromInput = getInput2("google-cloud-access-token", { required: false });
  if (fromInput) {
    return fromInput;
  }
  const workloadIdentityProvider = getInput2("workload-identity-provider", {
    required: false
  });
  if (workloadIdentityProvider) {
    const oidcRes = await fetchImpl(
      `${requireEnv("ACTIONS_ID_TOKEN_REQUEST_URL")}&audience=${encodeURIComponent(`https://iam.googleapis.com/${workloadIdentityProvider}`)}`,
      {
        headers: {
          Authorization: `bearer ${requireEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN")}`
        }
      }
    );
    if (!oidcRes.ok) {
      throw new Error(
        `Failed to get OIDC token: ${oidcRes.status} ${await oidcRes.text()}`
      );
    }
    const { value: oidcToken } = await oidcRes.json();
    const stsRes = await fetchImpl("https://sts.googleapis.com/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        audience: `//iam.googleapis.com/${workloadIdentityProvider}`,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        subject_token: oidcToken,
        requested_token_type: "urn:ietf:params:oauth:token-type:access_token"
      })
    });
    if (!stsRes.ok) {
      throw new Error(
        `Failed to exchange token: ${stsRes.status} ${await stsRes.text()}`
      );
    }
    const { access_token } = await stsRes.json();
    return access_token;
  }
  throw new Error("No Google Cloud access token provided");
}

// src/inputs.ts
function resolveOwner(repositoriesInput, env = process.env) {
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
function resolveRepositories(repositoriesInput, env = process.env) {
  if (repositoriesInput) {
    return repositoriesInput.split(/[\n,]/).map((r) => r.trim()).filter(Boolean).map((r) => r.includes("/") ? r.split("/")[1] : r);
  }
  const githubRepository = env.GITHUB_REPOSITORY;
  if (!githubRepository) throw new Error("GITHUB_REPOSITORY is not set");
  return [githubRepository.split("/")[1]];
}
function resolvePermissions(env = process.env) {
  const permissions = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("INPUT_PERMISSION-") || !value) continue;
    const name = key.slice("INPUT_PERMISSION-".length).toLowerCase().replaceAll("-", "_");
    permissions[name] = value;
  }
  return Object.keys(permissions).length > 0 ? permissions : void 0;
}
function resolveInputs(getInput2) {
  const clientId = getInput2("client-id", { required: true });
  const kmsKeyName = getInput2("kms-key-name", { required: true });
  const ownerInput = getInput2("owner");
  const repositoriesInput = getInput2("repositories");
  const permissions = resolvePermissions();
  if (ownerInput && !repositoriesInput) {
    return {
      type: "owner",
      clientId,
      kmsKeyName,
      owner: ownerInput,
      permissions
    };
  }
  return {
    type: "repo",
    clientId,
    kmsKeyName,
    owner: ownerInput || resolveOwner(repositoriesInput),
    repositories: resolveRepositories(repositoriesInput),
    permissions
  };
}

// src/minimal/run.ts
async function run(nowSeconds) {
  const inputs = resolveInputs(getInput);
  const googleCloudAccessToken = await resolveGoogleCloudAccessToken({
    getInput
  });
  const quotaProject = getInput("quota-project", { required: false }) || void 0;
  const now = nowSeconds ?? Math.floor(Date.now() / 1e3);
  const message = buildJwtSigningMessage(inputs.clientId, now);
  const jwt = await signJwtWithKms({
    kmsKeyName: inputs.kmsKeyName,
    message,
    accessToken: googleCloudAccessToken,
    quotaProject
  });
  const tokenResult = await getToken(inputs, jwt);
  debug(`Installation ID: ${tokenResult.installationId}`);
  debug(`Token expires at: ${tokenResult.expiresAt}`);
  setSecret(tokenResult.token);
  setOutput("token", tokenResult.token);
  saveState("token", tokenResult.token);
  saveState("expiresAt", tokenResult.expiresAt);
}
async function getToken(inputs, jwt) {
  if (inputs.type === "repo") {
    if (inputs.repositories.length === 0) {
      throw new Error("At least one repository is required");
    }
    return createRepoInstallationAccessToken({
      owner: inputs.owner,
      jwt,
      repositories: inputs.repositories,
      permissions: inputs.permissions
    });
  }
  return createOwnerInstallationAccessToken({
    owner: inputs.owner,
    jwt,
    permissions: inputs.permissions
  });
}

// src/entrypoint/minimal.index.ts
run().catch((error2) => {
  if (error2 instanceof Error) {
    setFailed(error2);
  }
});
