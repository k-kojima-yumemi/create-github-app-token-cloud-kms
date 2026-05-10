import { EOL } from "node:os";

function escapeData(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

export function issueCommand(command: string, message: string): void {
  process.stdout.write(`::${command}::${escapeData(message)}${EOL}`);
}
