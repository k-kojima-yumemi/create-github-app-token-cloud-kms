import { appendFileSync } from "node:fs";
import { EOL } from "node:os";
import { issueCommand } from "./command";

function assertSingleLine(value: string, label: string): void {
  if (/[\r\n]/.test(value)) {
    throw new Error(`${label} must be a single-line string`);
  }
}

function appendEnvFile(envVar: string, line: string): void {
  const filePath = process.env[envVar];
  if (!filePath) throw new Error(`${envVar} is not set`);
  appendFileSync(filePath, line + EOL, { encoding: "utf8" });
}

export function setSecret(secret: string): void {
  assertSingleLine(secret, "secret");
  issueCommand("add-mask", secret);
}

export function setOutput(name: string, value: string): void {
  assertSingleLine(name, "output name");
  assertSingleLine(value, "output value");
  appendEnvFile("GITHUB_OUTPUT", `${name}=${value}`);
}

export function saveState(name: string, value: string): void {
  assertSingleLine(name, "state name");
  assertSingleLine(value, "state value");
  appendEnvFile("GITHUB_STATE", `${name}=${value}`);
}
