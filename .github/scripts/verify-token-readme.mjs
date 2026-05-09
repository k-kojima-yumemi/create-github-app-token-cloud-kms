const { TOKEN, REPOSITORY, EXPECTED_STATUS } = process.env;

if (!TOKEN) {
  throw new Error("TOKEN is required");
}
if (!REPOSITORY) {
  throw new Error("REPOSITORY is required");
}
if (EXPECTED_STATUS === undefined || EXPECTED_STATUS === "") {
  throw new Error("EXPECTED_STATUS is required (e.g. 200 or 404)");
}

const expectedStatus = Number.parseInt(EXPECTED_STATUS, 10);
if (Number.isNaN(expectedStatus)) {
  throw new Error(`Invalid EXPECTED_STATUS: ${EXPECTED_STATUS}`);
}

async function readReadme(repo, token, expectedStatus) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/README.md`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
  });
  if (res.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} for ${repo}, got ${res.status}`);
  }
  if (expectedStatus === 200) {
    const { content, encoding } = await res.json();
    console.log(`[${repo}]`, Buffer.from(content, encoding).toString("utf-8").trim().slice(0, 100));
  } else {
    console.log(`[${repo}] OK (HTTP ${res.status} as expected)`);
  }
}

await readReadme(REPOSITORY, TOKEN, expectedStatus);
