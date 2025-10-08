# Repository Guidelines

## Project Structure & Module Organization
- `src/` – React + TypeScript app (components, stores, utils, extensions). Example: `src/components/...`, `src/stores/...`.
- `src-tauri/` – Tauri (Rust) backend, commands, plugins, and config. Entry via `src-tauri/src/` and `src-tauri/Cargo.toml`.
- `public/` – Static assets. `index.html` at repo root for Vite.
- `scripts/` – Cross‑platform setup and helpers (`scripts/linux/setup.sh`, `scripts/windows/setup.ps1`).
- `docs/` – Dev setup guides per OS.
- Tooling/config at root: `package.json`, `vite.config.ts`, `biome.json`, `rustfmt.toml`.

## Build, Test, and Development Commands
- Install deps: `bun install`
- One‑time setup: `bun run setup` (installs OS/toolchain helpers)
- Develop: `bun run dev` (Vite + Tauri dev)
- Desktop build: `bun run tauri build`
- Type + lint check: `bun run check` (TypeScript + Biome)
- Autofix/format: `bun run check:fix` or `bun run format`
- Clean workspace: `bun run clean`
- Rust checks: `cargo fmt --all -- --check` and `cargo check`

Requirements: Bun, Node 22+, Rust toolchain, Tauri CLI. See `docs/develop/*` for OS specifics.

## Coding Style & Naming Conventions
- TypeScript/JS: 2‑space indent, 100‑col wrap, double quotes, organized imports (Biome). Prefer kebab‑case file names; React components export PascalCase.
- Rust: rustfmt with 3‑space indent, 100‑col wrap; grouped imports per `rustfmt.toml`.
- Keep modules focused; colocate component styles and small helpers next to usage.

## Testing Guidelines
- No JS test runner is configured today. Add Rust unit tests with `#[cfg(test)]` blocks and run `cargo test` when applicable.
- If introducing TS tests, colocate as `*.test.ts(x)` next to sources and document the chosen runner in the PR.

## Commit & Pull Request Guidelines
- Commit style (enforced by commitlint): sentence‑case subject, 3–72 chars, no trailing period. Conventional types are optional.
- Git hooks: pre‑commit runs lint‑staged (Biome, cargo fmt); pre‑push runs `bun run check`; commit‑msg runs commitlint.
- PRs: pass `bun run check` and Rust formatting checks, rebase on `main`, squash to logical commits, and include a clear description, linked issues, and screenshots/video for UI changes (see `.github/PULL_REQUEST_TEMPLATE.md`).

## Agent‑Specific Instructions
- Prefer repo scripts (`bun run ...`) over ad‑hoc commands; adhere to `.editorconfig`, `biome.json`, and `rustfmt.toml`.
- Keep changes minimal and scoped; reference files with full clickable paths in discussions.
