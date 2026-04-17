---
name: ui-test
description: Launch the game in a headless browser, take screenshots, and interact with UI elements to visually verify layout and behavior.
allowed-tools: Bash, Read
---

# UI Testing

Use Puppeteer (already installed as a project dependency) to launch the game in a headless browser, interact with it, and take screenshots for visual verification.

Two tools live in `.claude/skills/ui-test/`:
- **`cli.cjs`** — CLI for common one-shot actions (screenshot, click, hover, key, drag). **Prefer this for simple tasks.**
- **`helpers.cjs`** — require-able module for custom multi-step scripts.

## 1. Start the Dev Server

Start Vite on a fixed port as a background task:

```bash
npx vite --port 5555 &
sleep 3 && echo "ready"
```

Run this with `run_in_background: true`. Wait a few seconds, then confirm the server is up by reading the background task output.

## 2. CLI Commands (preferred)

Run via `node .claude/skills/ui-test/cli.cjs <command> [args]`. Each command launches the game, performs the action, takes a screenshot, prints the path, and exits.

| Command | Usage | Description |
|---------|-------|-------------|
| `screenshot` | `screenshot [name]` | Take a screenshot of the current game state |
| `click` | `click <x> <y> [name]` | Click at viewport coords, then screenshot |
| `hover` | `hover <x> <y> [name]` | Hover at viewport coords, then screenshot |
| `key` | `key <keyName> [name]` | Press a key (e.g. Space, Enter, ArrowLeft), then screenshot |
| `sequence` | `sequence <actions...> [--name <base>]` | Run multiple actions, screenshot after each |

### Sequence actions

The `sequence` command accepts a chain of named actions:

| Action | Example | Description |
|--------|---------|-------------|
| `click:<x>,<y>` | `click:480,270` | Click at viewport coords |
| `hover:<x>,<y>` | `hover:480,270` | Hover at viewport coords |
| `drag:<x1>,<y1>,<x2>,<y2>` | `drag:100,100,200,200` | Drag between two points |
| `key:<keyName>` | `key:Space` | Press a key |
| `wait:<ms>` | `wait:1000` | Wait for given milliseconds |

Example:

```bash
node .claude/skills/ui-test/cli.cjs sequence click:480,270 key:Space --name test
```

This takes an initial screenshot, then screenshots after each action: `test-1-initial.png`, `test-2-click-480-270.png`, `test-3-key-Space.png`.

After running any CLI command, use the **Read tool** on the output `.png` file to view it.

## 3. Helpers Module (for custom scripts)

For complex flows not covered by the CLI, write a script using the helpers module:

```js
const h = require('./.claude/skills/ui-test/helpers');
(async () => {
  await h.launchGame();
  await h.screenshot('screenshot');
  await h.cleanup();
})();
```

Run with `node -e "..."` via Bash, then use the **Read tool** on the `.png`.

### API

| Function | Description |
|----------|-------------|
| `launchGame(opts?)` | Launch browser, navigate to game, wait for init. Options: `{ port: 5555, wait: 3000 }` |
| `screenshot(name?)` | Save screenshot as `{name}.png`. Auto-increments if no name given. Returns the file path. |
| `cleanup()` | Close browser. **Always call this at the end.** |
| `sleep(ms)` | Async delay. |
| `click(x, y, waitMs?)` | Click at viewport coords, default 500ms wait |
| `hover(x, y, waitMs?)` | Hover at viewport coords, default 400ms wait |
| `drag(fromX, fromY, toX, toY, waitMs?)` | Drag from one point to another |
| `pressKey(key, waitMs?)` | Press a key, default 300ms wait |
| `getPage()` | Returns the active Puppeteer `Page` for advanced scripting |

### Constants

- `VIEWPORT_W` (960), `VIEWPORT_H` (540), `SERVER_PORT` (5555)

## 4. Coordinate Reference

All coordinates are in **viewport space** (960x540). Game resolution is 1920x1080 with `Phaser.Scale.FIT`, so viewport coords = game coords / 2.

As the game UI takes shape, document positions of key interactive elements (buttons, panels) here so future test runs stay coordinate-stable.

## 5. Cleanup

After testing:
- Delete screenshot files: `rm test-*.png screenshot*.png seq-*.png`
- Stop the background dev server via `TaskStop` if still running

## Tips

- If the dev server port is already in use, Vite auto-increments. Use a specific port (`--port 5555`) to keep coordinates predictable.
- For debugging layout issues, take screenshots at each step rather than one big script.
- The helpers module manages browser state internally. Call `cleanup()` before `launchGame()` if you need to restart.
