# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

1. Fetch and rebase onto the latest master before doing any exploration or implementation.
2. `cd` into the working directory once at the start of a session. Use relative paths or absolute paths for all subsequent commands — do NOT `cd` before every command.
3. Never jump straight into implementation. Interview the user to clarify requirements and narrow down the scope of the task. Do not ask questions that you can verify yourself.
4. Before beginning any new task, start a new git worktree and work within it.
5. In the worktree, pull the latest master and create a new branch from it. ALWAYS make changes on top of the latest master.

## Coding style

1. Prefer Single Source of Truth, make the code reusable when needed. Avoid duplication as much as possible.
2. Follow SOLID, honor Single Responsibility Principle for any component you create.
3. Prefer delegation over inheritance.
4. Separate UI from game logic as much as possible.

## Commands

- **Dev server:** `npm run dev` (Vite, opens at localhost:5173)
- **Build:** `npm run build` (runs `tsc && vite build`, outputs to `dist/`)
- **Preview production build:** `npm run preview`
- **Type-check only:** `npx tsc --noEmit`
- **Git in worktrees:** Use `git -C <path>` instead of `cd <path> && git ...`. The `-C` flag tells git to run from the given directory. This avoids permission issues since `Bash(git *)` is auto-allowed but `cd <path> && git ...` cannot be glob-matched reliably.

No unit tests exist. ALWAYS use ui-test skill to verify changes visually.

## Architecture

Browser-based game built with **Phaser 3** and **TypeScript**, bundled with **Vite**.

Game resolution is 1920x1080 with `Phaser.Scale.FIT` auto-centering. Assets live in `public/sprites/` and are preloaded in `BootScene`.

### Source layout (`src/`)

- **`main.ts`** — Entry point. Creates the Phaser game with the scene list. Uses `Phaser.AUTO` so headless puppeteer (no WebGL) falls back to canvas — keep it on AUTO unless you have a reason not to.
- **`scenes/`** — Phaser scenes:
  - `SplashScene` → `BootScene` → `GameScene` (gameplay) → `GameOverScene` (on sanity 0, with Try Again button that restarts `GameScene`).
- **`game/`** — Pure logic, no Phaser imports.
  - `GameState` — owns sanity / fuel / lighthouse health / lightOn flag and the deck. `swipe(dir)` mutates state and returns a snapshot. UI never reads internals directly.
  - `Card` / `CardSupplier` — infinite deck supplier.
- **`ui/`** — Phaser-dependent views, each owning a single visual concern (SRP).
  - `LighthouseView` — top half. Lighthouse + sky + health bar; `setLight(on)` toggles silhouette mode; `flashLight()` strobes the cone.
  - `BottomPanel` — bottom half (dark left / light right). Shows sanity & fuel; `setSwipeHint(offset)` highlights the side being swiped toward.
  - `CardView` — draggable card. Calls back with `"left"` / `"right"` when a swipe crosses threshold.
  - `HealthBar` — reusable bar with optional inline numeric label.
  - `fonts.ts` — Beholden font loader and `createText` helper.

`GameScene` wires `GameState` ⇄ views; views never know about `GameState`. When adding a new resource or interaction, update `GameState` first, then thread the new snapshot field into the affected view.

## CI/CD

- **Build workflow** (`.github/workflows/build.yml`): Runs on PRs and master pushes. Node 20, `npm ci`, `npm run build`, uploads `dist/` as artifact.
- **Deploy workflow** (`.github/workflows/build_deploy.yml`): Runs on GitHub releases or manual dispatch. Calls the build workflow then deploys to itch.io via Butler. Requires `BUTLER_CREDENTIALS` secret and `ITCH_USER` / `ITCH_GAME` variables.
- **Claude Code** (`.github/workflows/claude.yml`): Responds to `@claude` mentions in issues/PRs.
- **Claude Code Review** (`.github/workflows/claude-code-review.yml`): Automated review on PR open/sync.
