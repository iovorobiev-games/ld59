#!/usr/bin/env node
const h = require("./helpers.cjs");

const COMMANDS = {
  screenshot: {
    usage: "screenshot [name]",
    desc: "Take a screenshot of the current game state",
    run: async (args) => {
      await h.launchGame();
      const path = await h.screenshot(args[0] || "screenshot");
      console.log(path);
      await h.cleanup();
    },
  },
  click: {
    usage: "click <x> <y> [name]",
    desc: "Click at viewport coords, then screenshot",
    run: async (args) => {
      const x = parseFloat(args[0]);
      const y = parseFloat(args[1]);
      if (isNaN(x) || isNaN(y)) {
        console.error("Usage: click <x> <y> [name]");
        process.exit(1);
      }
      await h.launchGame();
      await h.click(x, y);
      const path = await h.screenshot(args[2] || `click-${x}-${y}`);
      console.log(path);
      await h.cleanup();
    },
  },
  hover: {
    usage: "hover <x> <y> [name]",
    desc: "Hover at viewport coords, then screenshot",
    run: async (args) => {
      const x = parseFloat(args[0]);
      const y = parseFloat(args[1]);
      if (isNaN(x) || isNaN(y)) {
        console.error("Usage: hover <x> <y> [name]");
        process.exit(1);
      }
      await h.launchGame();
      await h.hover(x, y);
      const path = await h.screenshot(args[2] || `hover-${x}-${y}`);
      console.log(path);
      await h.cleanup();
    },
  },
  key: {
    usage: "key <keyName> [name]",
    desc: "Press a key (e.g. Space, Enter, ArrowLeft), then screenshot",
    run: async (args) => {
      if (!args[0]) {
        console.error("Usage: key <keyName> [name]");
        process.exit(1);
      }
      await h.launchGame();
      await h.pressKey(args[0]);
      const path = await h.screenshot(args[1] || `key-${args[0]}`);
      console.log(path);
      await h.cleanup();
    },
  },
  sequence: {
    usage: "sequence <action1> <action2> ... [--name <name>]",
    desc: "Run a sequence of actions, screenshot after each. Actions: click:<x>,<y>, hover:<x>,<y>, drag:<x1>,<y1>,<x2>,<y2>, key:<keyName>, wait:<ms>",
    run: async (args) => {
      const nameIdx = args.indexOf("--name");
      let baseName = "seq";
      let actions = args;
      if (nameIdx !== -1) {
        baseName = args[nameIdx + 1] || "seq";
        actions = args.slice(0, nameIdx);
      }

      await h.launchGame();
      let step = 0;

      const snap = async (label) => {
        step++;
        const path = await h.screenshot(`${baseName}-${step}-${label}`);
        console.log(path);
      };

      await snap("initial");

      for (const action of actions) {
        if (action.startsWith("click:")) {
          const [x, y] = action.slice(6).split(",").map(Number);
          await h.click(x, y);
          await snap(`click-${x}-${y}`);
        } else if (action.startsWith("hover:")) {
          const [x, y] = action.slice(6).split(",").map(Number);
          await h.hover(x, y);
          await snap(`hover-${x}-${y}`);
        } else if (action.startsWith("drag:")) {
          const [x1, y1, x2, y2] = action.slice(5).split(",").map(Number);
          await h.drag(x1, y1, x2, y2);
          await snap(`drag-${x1}-${y1}-to-${x2}-${y2}`);
        } else if (action.startsWith("key:")) {
          const key = action.slice(4);
          await h.pressKey(key);
          await snap(`key-${key}`);
        } else if (action.startsWith("wait:")) {
          const ms = parseInt(action.slice(5), 10);
          await h.sleep(ms);
        } else {
          console.error(`Unknown action: ${action}`);
        }
      }

      await h.cleanup();
    },
  },
};

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log("Usage: node cli.cjs <command> [args]\n");
    console.log("Commands:");
    for (const [, def] of Object.entries(COMMANDS)) {
      console.log(`  ${def.usage.padEnd(50)} ${def.desc}`);
    }
    process.exit(0);
  }

  const command = COMMANDS[cmd];
  if (!command) {
    console.error(`Unknown command: ${cmd}. Run with --help for usage.`);
    process.exit(1);
  }

  try {
    await command.run(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    await h.cleanup();
    process.exit(1);
  }
}

main();
