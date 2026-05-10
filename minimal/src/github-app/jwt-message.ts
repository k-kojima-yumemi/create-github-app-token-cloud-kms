const expTime = 120;

export function buildJwtSigningMessage(
  clientId: string,
  nowSeconds: number,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iat: nowSeconds - 60,
      exp: nowSeconds + expTime,
      iss: clientId,
    }),
  ).toString("base64url");
  return `${header}.${payload}`;
}
