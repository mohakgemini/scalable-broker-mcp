import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Resolve the CLI binary. Priority:
 *   1. SCALABLE_CLI_PATH (set from the extension's settings field)
 *   2. Common Homebrew locations — GUI apps on macOS don't inherit the shell
 *      PATH, so `/opt/homebrew/bin` (Apple Silicon) and `/usr/local/bin`
 *      (Intel) aren't searchable by a bare `sc`.
 *   3. Bare `sc`, relying on PATH (works in CLI clients like Claude Code).
 */
function resolveScBin(): string {
  const configured = process.env.SCALABLE_CLI_PATH?.trim();
  if (configured) return configured;
  const common = ["/opt/homebrew/bin/sc", "/usr/local/bin/sc"];
  return common.find(existsSync) ?? "sc";
}

const SC_BIN = resolveScBin();
const TIMEOUT_MS = Number(process.env.SCALABLE_MCP_TIMEOUT_MS ?? 15000);

/** Errors that carry a plain-English, user-actionable message. */
export class ScError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScError";
  }
}

/**
 * Run the Scalable CLI with the given args and return stdout.
 * Uses execFile (no shell) so untrusted args can't be interpreted as commands.
 */
export async function sc(args: string[]): Promise<string> {
  try {
    const { stdout } = await run(SC_BIN, args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf8",
    });
    return stdout.trim();
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      stderr?: string;
      stdout?: string;
      killed?: boolean;
    };

    if (e.code === "ENOENT") {
      throw new ScError(
        "The Scalable CLI (`sc`) was not found. Install it from " +
          "github.com/ScalableCapital/scalable-cli, or set the CLI path in this extension's settings."
      );
    }
    if (e.killed) {
      throw new ScError(`The \`sc\` command timed out after ${TIMEOUT_MS} ms.`);
    }

    const detail = (e.stderr || e.stdout || e.message || "").trim();

    if (/log\s?in|login|auth|unauthor|session|token|expired/i.test(detail)) {
      throw new ScError("Not authenticated. Open a terminal, run `sc login`, then try again.");
    }
    if (/allow[- ]?list|not\s+allowed|installation[- ]?code/i.test(detail)) {
      throw new ScError(
        "Your account isn't allowlisted for the CLI beta yet. Run `sc installation-code` " +
          "and email the code to cli.beta@scalable.capital, then wait for confirmation."
      );
    }
    throw new ScError(detail || "The `sc` command failed.");
  }
}

/** Append `--json` so the model receives structured output. */
export function json(args: string[]): string[] {
  return [...args, "--json"];
}
