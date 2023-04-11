import { command, positional, run, string } from "cmd-ts";
import { createApp } from "./create-app";
import { Log } from "./script-logging";

const app = command({
  name: "create-crx-app",
  args: {
    name: positional({ type: string, displayName: "Project name" }),
  },
  handler: ({ name }) => {
    createApp(name);
  },
});

run(app, process.argv.slice(2)).catch((e) => {
  Log.error("Failed to create app", e);
});
