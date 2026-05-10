export interface InputOptions {
  required?: boolean;
  trimWhitespace?: boolean;
}

export function getState(
  name: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return env[`STATE_${name}`] ?? "";
}

export function getInput(
  name: string,
  options?: InputOptions,
  env: Record<string, string | undefined> = process.env,
): string {
  const val = env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? "";
  if (options?.required && !val) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  if (options?.trimWhitespace === false) {
    return val;
  }
  return val.trim();
}
