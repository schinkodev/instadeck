# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private reporting: **Security tab, Report a vulnerability**. Include what you found, how to reproduce it and what an attacker could do. You will get a first answer within a few days.

## Scope

- The MCP server in this repository (`server/`, `lib/`), both the local stdio server and the hosted connector at `https://instadeck.app/mcp`.
- The deck, asset and download endpoints (`/d/*`, `/a/*`).

Decks on the hosted connector are reachable by anyone who has the link, by design. The link is an unguessable id. Do not put secrets in a deck.

## Out of scope

Reports that need physical access, social engineering, denial of service by volume, or findings in third-party services we depend on (report those upstream).
