import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const LOG_DIR = join(process.cwd(), ".dunelin");
const LOG_FILE = join(LOG_DIR, "debug.log");

let enabled = false;

export function enableDebugLog(): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    enabled = true;
    log("debug", "--- session start ---");
  } catch {
    // silently fail if we can't create log dir
  }
}

export function log(level: "debug" | "info" | "warn" | "error", message: string): void {
  if (!enabled) return;
  const ts = new Date().toISOString();
  const pid = process.pid;
  try {
    appendFileSync(LOG_FILE, `[${ts}] [${pid}] [${level}] ${message}\n`);
  } catch {
    // never crash on logging
  }
}
