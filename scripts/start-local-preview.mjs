import { openSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const output = openSync(path.join(projectRoot, "tmp", "dev-server.stdout.log"), "a");
const error = openSync(path.join(projectRoot, "tmp", "dev-server.stderr.log"), "a");
const environment = {};
for (const [key, value] of Object.entries(process.env)) {
  const normalizedKey = key.toLowerCase() === "path" ? "Path" : key;
  if (!(normalizedKey in environment) || key === "Path") {
    environment[normalizedKey] = value;
  }
}
const child = spawn(
  process.execPath,
  [nextCli, "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  {
    cwd: projectRoot,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", output, error],
    env: environment,
  },
);

await new Promise((resolve, reject) => {
  child.once("spawn", resolve);
  child.once("error", reject);
});
child.unref();
process.stdout.write(`${child.pid}\n`);
