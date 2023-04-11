import { command, positional, run, string } from "cmd-ts";
import { Log } from "./script-logging";
import { build, watch } from "./build";
import { setupKeys } from "./keys";

const app = command({
  name: "crx-scripts",
  args: {
    script: positional({
      type: string,
      displayName: "script",
      description: "'build', 'watch', or 'setup'",
    }),
  },
  handler: ({ script }) => {
    switch (script) {
      case "build": {
        build();
        return;
      }
      case "setup": {
        setupKeys();
        return;
      }
      case "watch": {
        watch();
        return;
      }
      default: {
        Log.error(
          `Unrecognized option: ${script}`,
          `Valid options are 'build' or 'setup'`
        );
      }
    }
  },
});

run(app, process.argv.slice(2)).catch((e) => {
  Log.error("Failed to execute script", e);
});
