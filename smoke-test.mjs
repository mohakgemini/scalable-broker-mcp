import { spawn } from "node:child_process";

const child = spawn("node", ["bundle/server/index.js"], {
  stdio: ["pipe", "pipe", "pipe"],
  // Force the not-installed path deterministically:
  env: { ...process.env, SCALABLE_CLI_PATH: "/nonexistent/sc" },
});

let buf = "";
const responses = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id != null) responses.set(msg.id, msg);
  }
});
child.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

const send = (obj) => child.stdin.write(JSON.stringify(obj) + "\n");
const waitFor = (id) =>
  new Promise((res, rej) => {
    const t = setInterval(() => {
      if (responses.has(id)) {
        clearInterval(t);
        res(responses.get(id));
      }
    }, 20);
    setTimeout(() => {
      clearInterval(t);
      rej(new Error(`timeout waiting for id ${id}`));
    }, 8000);
  });

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  },
});
const init = await waitFor(1);
console.log("initialize -> serverInfo:", JSON.stringify(init.result.serverInfo));

send({ jsonrpc: "2.0", method: "notifications/initialized" });

send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
const list = await waitFor(2);
const names = list.result.tools.map((t) => t.name).sort();
console.log(`tools/list -> ${names.length} tools:`, names.join(", "));

send({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "check_setup", arguments: {} },
});
const call = await waitFor(3);
console.log("check_setup -> isError:", call.result.isError === true);
console.log("check_setup -> text:", call.result.content[0].text);

child.kill();
process.exit(0);
