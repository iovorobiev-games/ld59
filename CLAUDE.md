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

- **`main.ts`** — Entry point. Creates the Phaser game with the scene list. Uses `Phaser.AUTO` so headless puppeteer (no WebGL) falls back to canvas — keep it on AUTO unless you have a reason not to. Registers post-FX pipelines in `callbacks.postBoot` so they're available before scenes call `create()`.
- **`pipelines/`** — WebGL post-FX pipelines. `SilhouettePipeline` (per-object outline) and `CrtPipeline` (scene-wide scanlines + barrel + chromatic aberration + noise, attached via `applyCrtPipeline(scene)` in each visual scene's `create()`). Both are no-ops on the canvas fallback.
- **`scenes/`** — Phaser scenes:
  - `SplashScene` → `BootScene` → `GameScene` (gameplay) → `GameOverScene` (on sanity 0, with Try Again button that restarts `GameScene`).
- **`game/`** — Pure logic, no Phaser imports.
  - `GameState` — owns sanity / fuel / lighthouse health / lightOn flag, the card supplier, the `EncounterManager`, turn counter (3 cards/turn), and `phase` (`player` | `transitioning` | `gameOver` | `victory`). `playCard(dir)` applies card effect, resolves encounter, triggers enemy attack after 3 cards, and returns a `PlayCardResult` event. `advanceEncounter()` moves to the next encounter after the scene finishes the overlay. Left swipe = Dark (queues −1 next-attack dmg on enemy); right swipe = Light (1 dmg to enemy).
  - `Card` / `CardSupplier` — infinite deck supplier.
  - `Ability` — `Ability` interface (`name`, `intent: AbilityIntent { icon, label, value? }`, `use`), `DealDamageAbility(damage)`, `PlayerTarget` (anything with `takeDamage(amount)`). New enemy powers plug in by implementing `Ability` — the `intent` lets the UI telegraph them without special-casing.
  - `Enemy` — HP, list of `Ability`, queued damage reduction (cleared after one attack). `rollIntent()` picks and locks the next ability (STS-style telegraph); `useIntent(ctx)` fires it and clears. `intent` getter returns the locked `Ability | null`.
  - `Encounter` — `UnfriendlyEncounter(enemy)` resolves when enemy dies; `FriendlyEncounter(description)` resolves after 1 card.
  - `EncounterManager` — deck of encounters (built by `buildDefaultDeck()` — 6 encounters mixing friendly and unfriendly). Beating the deck = victory.
- **`ui/`** — Phaser-dependent views, each owning a single visual concern (SRP).
  - `LighthouseView` — top half. Lighthouse + sky + health bar; `setLight(on)` toggles silhouette mode; `flashLight()` strobes the cone.
  - `BottomPanel` — bottom half (dark left / light right). Shows sanity & fuel; `setSwipeHint(offset)` highlights the side being swiped toward.
  - `CardView` — draggable card. Calls back with `"left"` / `"right"` when a swipe crosses threshold.
  - `HealthBar` — reusable bar with optional inline numeric label and visibility toggle.
  - `EnemyView` — placeholder rectangle + HP bar + pending-reduction label + intent badge (icon + value, above name), positioned left of the lighthouse. Accepts an `EnemyVisual` config so future sprites plug in without changing the class. `setIntent(AbilityIntent | null)` updates the telegraph.
  - `FriendlyView` — glow + card silhouette + description for friendly encounters.
  - `EncounterOverlay` — dim rect + centered message (e.g. "ABOMINATION EXPELLED"); fades in/out and fires a callback on completion. Cards stay visible but are locked via `phase === 'transitioning'`.
  - `TurnIndicator` — top-right HUD showing "Encounter X / Y" and cards-remaining (or "Play any 1 card to pass" for friendly).
  - `fonts.ts` — Beholden font loader and `createText` helper.

`GameScene` wires `GameState` ⇄ views; views never know about `GameState`. When adding a new resource or interaction, update `GameState` first, then thread the new snapshot field into the affected view. New enemies go in `buildDefaultDeck()` (or any other deck builder) with whatever `Ability` subclasses they need; the view layer needs no changes unless you want custom visuals, which go through `EnemyView.show(name, hp, max, visual?)`.

## CI/CD

- **Build workflow** (`.github/workflows/build.yml`): Runs on PRs and master pushes. Node 20, `npm ci`, `npm run build`, uploads `dist/` as artifact.
- **Deploy workflow** (`.github/workflows/build_deploy.yml`): Runs on GitHub releases or manual dispatch. Calls the build workflow then deploys to itch.io via Butler. Requires `BUTLER_CREDENTIALS` secret and `ITCH_USER` / `ITCH_GAME` variables.
- **Claude Code** (`.github/workflows/claude.yml`): Responds to `@claude` mentions in issues/PRs.
- **Claude Code Review** (`.github/workflows/claude-code-review.yml`): Automated review on PR open/sync.
