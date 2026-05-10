import { EOL } from "node:os";

function escapeData(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function issueCommand(command: string, message: string): void {
  process.stdout.write(`::${command}::${escapeData(message)}${EOL}`);
}

export function debug(message: string): void {
  issueCommand("debug", message);
}

export function info(message: string): void {
  process.stdout.write(message + EOL);
}

export function warning(message: string | Error): void {
  issueCommand(
    "warning",
    message instanceof Error ? message.toString() : message,
  );
}

export function error(message: string | Error): void {
  issueCommand(
    "error",
    message instanceof Error ? message.toString() : message,
  );
}

export function setFailed(message: string | Error): void {
  process.exitCode = 1;
  error(message);
}
