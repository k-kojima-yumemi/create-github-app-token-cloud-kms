import { EOL } from "node:os";
import { issueCommand } from "./command";

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
