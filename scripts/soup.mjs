import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const candidates = [
  process.env.SOUP_BIN,
  "soup",
  join(homedir(), ".soup", "bin", "soup"),
].filter(Boolean);

function canRun(command) {
  const result = spawnSync(command, ["--help"], {
    stdio: "ignore",
    shell: command === "soup",
  });

  return result.status === 0;
}

function resolveSoup() {
  for (const candidate of candidates) {
    if (candidate !== "soup") {
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }

    if (canRun(candidate)) return candidate;
  }

  console.error("Soup CLI was not found.");
  console.error("Install it with: curl -fsSL https://cli.getsoup.dev/install.sh | sh");
  process.exit(127);
}

const soup = resolveSoup();
const args = process.argv.slice(2);
const result = spawnSync(soup, args, {
  stdio: "inherit",
  shell: soup === "soup",
});

process.exit(result.status ?? 1);
