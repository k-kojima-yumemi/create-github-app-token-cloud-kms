export function requireEnv(
  name: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env[name];
  if (!value) throw new Error(`Environment variable ${name} is required`);
  return value;
}
