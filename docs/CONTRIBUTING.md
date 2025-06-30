# Contributing to Athas

Welcome! We're happy to have you here. Thank you in advance for your contribution in Athas.

# The Basics

Athas welcomes contributions in the form of pull requests.

For small changes (e.g., bug fixes), feel free to submit a PR.

For larger changes (e.g., new lint rules, new functionality, new configuration options), consider creating an issue outlining your proposed change. You can also join us on slack to discuss your idea with the community. We've labeled beginner-friendly tasks in the issue tracker, along with bugs and improvements that are ready for contributions.

If you have suggestions on how we might improve the contributing documentation, let us know!

# Prerequisites
Athas is a tauri project, so you need to install bun and rust.

- [Rust](https://rustup.rs) with `cargo`, `rustfmt`, and `clippy`
- [Tauri CLI](https://tauri.app) → `cargo install tauri-cli`
- [Node.js ≥ 18](https://nodejs.org) and a package manager (`npm`, `pnpm`, or `yarn`)
- Frontend framework CLI (e.g., Vite, Vue CLI, etc.)
- Optional: `eslint`, `prettier`, and testing tools (`vitest`, `jest`, etc.)

Check with: `node -v`, `cargo --version`, `tauri --version`

# Development
After cloning the repository, run Athas locally from the repository root with:

```bash
bun install
bun run tauri dev
```
Prior to opening a pull request, ensure that your code has been auto-formatted, and that it passes both the lint and test validation checks
These checks will run on GitHub Actions when you open your pull request, but running them locally will save you time and expedite the merge process.
Note: Make sure the app don't crash when you run `bun run tauri dev`
