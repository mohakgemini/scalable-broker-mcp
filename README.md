# Scalable Broker MCP (read-only)

Read your Scalable Capital portfolio from inside Claude. This is a small,
**read-only** MCP server that wraps the official
[Scalable CLI](https://github.com/ScalableCapital/scalable-cli) (`sc`).
It can show your overview, holdings, transactions, analytics, watchlist,
savings plans, and price alerts, and look up instruments and news.

> **Unofficial.** Not affiliated with or endorsed by Scalable Capital.
> "Scalable Capital" is a trademark of its owner. It **cannot place, modify,
> or cancel trades** — by design.

---

## For non-technical users (Claude Desktop)

You only need to do four things, once.

1. **Install the Scalable CLI.** Follow the instructions at
   github.com/ScalableCapital/scalable-cli (Homebrew on macOS, or the
   installer/archive on the releases page).
2. **Get allowlisted.** In a terminal run `sc installation-code`, then email
   the code to `cli.beta@scalable.capital` with subject "Scalable CLI
   Allowlisting". Wait for their confirmation.
3. **Log in.** In a terminal run `sc login` and complete the browser step
   yourself. (This must be done by you, not by Claude — it's the security step.)
4. **Install this extension.** Download `scalable-broker.mcpb`, then in Claude
   Desktop go to **Settings → Extensions → Install Extension**, pick the file,
   and click Install. No terminal or config editing needed.

Then just ask Claude things like *"check my Scalable setup"* or
*"how is my portfolio doing?"* If something isn't working, ask Claude to
**run `check_setup`** — it will tell you in plain English what's missing.

If `sc` isn't on your PATH, open the extension's settings and paste the full
path to the `sc` binary.

---

## For developers (build it yourself)

Requirements: Node.js 18+.

```bash
npm install
npm run typecheck     # tsc --noEmit
npm run build         # tsc -> server/index.js, server/sc.js
```

Assemble and pack the bundle:

```bash
# copy build output + manifest into bundle/, install prod-only deps
mkdir -p bundle/server
cp manifest.json bundle/
cp server/index.js server/sc.js bundle/server/
# bundle/package.json declares prod deps (type: module)
( cd bundle && npm install --omit=dev )

# pack — either with the official packer:
npm i -g @anthropic-ai/mcpb && ( cd bundle && mcpb pack . ../scalable-broker.mcpb )
# ...or, since .mcpb is just a zip with manifest.json at the root:
( cd bundle && zip -rq ../scalable-broker.mcpb . )
```

`mcpb validate manifest.json` checks the manifest against the current schema —
run it if you change the manifest, since the schema version evolves.

### Tools (all read-only)

| Tool | What it returns |
| --- | --- |
| `check_setup` | Whether `sc` is installed and logged in |
| `portfolio_overview` | Total value, P/L, allocation |
| `analytics` | Performance breakdown |
| `holdings` | Current holdings |
| `transactions` | Recent transactions |
| `watchlist` | Watchlist |
| `savings_plans` | Savings plans |
| `price_alerts` | Active price alerts |
| `search_security` | Instrument search by name/ticker |
| `security_news` | News for an ISIN |

### Configuration (env vars)

| Variable | Default | Purpose |
| --- | --- | --- |
| `SCALABLE_CLI_PATH` | `sc` | Full path to the `sc` binary if not on PATH |
| `SCALABLE_MCP_TIMEOUT_MS` | `15000` | Per-command timeout |

## Security notes

- **Read-only.** No trading tools are exposed. Do not add buy/sell to a build
  meant for non-technical users.
- **Credentials never touch this server.** Login is the CLI's own OAuth
  device-code flow, run by you; the session lives in your OS keyring.
- **Returned data is untrusted.** Instrument names, search results, and news
  text flow into the model's context — treat them as data, never as
  instructions. The server's `instructions` field tells the model the same.
- An unsigned `.mcpb` shows a security prompt on install. That's expected;
  sign it if you distribute widely.

## License

MIT
