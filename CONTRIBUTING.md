# Contributing

Read the [Code of Conduct](./CODE_OF_CONDUCT.md) before participating. Use the issue tracker for bugs and proposals related to this workbench. For upstream JSON Crack issues, use the [upstream tracker](https://github.com/AykutSarac/jsoncrack.com/issues).

## Local setup

Use Node.js 24 or later and pnpm 10.20.0.

```sh
pnpm install --frozen-lockfile
pnpm dev:www
```

The workbench opens at [http://localhost:3000](http://localhost:3000).

## Project layout

- `apps/www` contains the Next.js workbench, Wonderware input, and normalization tests.
- `packages/jsoncrack-react` contains the shared graph renderer.
- `apps/chrome-extension` and `apps/vscode` contain the upstream extension workspaces.

## Before opening a pull request

Run `pnpm lint`, `pnpm test`, and `pnpm build:www`. For editor changes, verify standard JSON, a doubled-quote Wonderware value, and malformed input. Edit a value, generate AVEVA output, and paste it back into the source field to check the round trip. Check keyboard focus, the narrow-screen layout, and both visualization modes.

Keep the change focused. Explain the behavior and verification in the pull request. For visual changes, include screenshots at desktop and mobile sizes.
