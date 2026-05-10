"use strict";

// src/actions-wrapper/log.ts
var import_node_os = require("node:os");
function escapeData(s) {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function issueCommand(command, message) {
  process.stdout.write(`::${command}::${escapeData(message)}${import_node_os.EOL}`);
}
function debug(message) {
  issueCommand("debug", message);
}
function info(message) {
  process.stdout.write(message + import_node_os.EOL);
}
function warning(message) {
  issueCommand(
    "warning",
    message instanceof Error ? message.toString() : message
  );
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
function getState(name, env = process.env) {
  return env[`STATE_${name}`] ?? "";
}

// src/post.ts
async function post() {
  const token = getState("token");
  if (!token) {
    debug("No token to revoke");
    return;
  }
  const expiresAt = getState("expiresAt");
  if (expiresAt && tokenExpiresIn(expiresAt) < 0) {
    info("Token expired, skipping token revocation");
    return;
  }
  const res = await fetch("https://api.github.com/installation/token", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (res.ok) {
    info("Token revoked");
  } else {
    warning(`Failed to revoke token: ${res.status} ${await res.text()}`);
  }
}
function tokenExpiresIn(expiresAt) {
  const now = /* @__PURE__ */ new Date();
  const expiresAtDate = new Date(expiresAt);
  return Math.round((expiresAtDate.getTime() - now.getTime()) / 1e3);
}

// src/entrypoint/minimal.post.ts
post().catch((error2) => {
  if (error2 instanceof Error) {
    setFailed(error2);
  }
});
