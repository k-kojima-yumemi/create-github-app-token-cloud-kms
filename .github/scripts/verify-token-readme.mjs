const { TOKEN, REPOSITORY } = process.env;

if (!TOKEN) {
  throw new Error("TOKEN is required");
}
if (!REPOSITORY) {
  throw new Error("REPOSITORY is required");
}

async function readReadme(repo, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/README.md`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to read README.md in ${repo}: ${res.status}`);
  }
  const { content, encoding } = await res.json();
  console.log(`[${repo}]`, Buffer.from(content, encoding).toString("utf-8").trim().slice(0, 100));
}

await readReadme(REPOSITORY, TOKEN);
