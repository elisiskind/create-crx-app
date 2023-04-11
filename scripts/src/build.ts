import * as esbuild from "esbuild";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { Log } from "./script-logging";
import "node-rsa";
import { Keys } from "./keys";
import { resolve } from "path";
import * as process from "process";
import { execSync } from "node:child_process";

type Manifest = chrome.runtime.ManifestV3;
type ContentScript = Exclude<Manifest["content_scripts"], undefined>[number];

interface Config {
  entryPoints: {
    contentScripts?: {
      matches: string[];
      location: string;
      staticDir: string;
    }[];
    backgroundScript?: string;
    popup?: string;
    additionalScripts?: Record<
      string,
      {
        location: string;
        matches: string[];
      }
    >;
  };
  buildOptions: {
    fontExtensions?: string[];
    outputDir: string;
    postBuildScript?: string;
    sourceRoot?: string;
  };
  manifest: Partial<chrome.runtime.ManifestV3>;
}

export const writeManifest = (
  keys: Keys,
  { entryPoints, buildOptions, manifest }: Config
) => {
  manifest.key = keys.publicKey;

  if (entryPoints.backgroundScript) {
    manifest.background = {
      service_worker: "background.js",
    };
  }

  if (entryPoints.popup) {
    manifest.action = {
      default_popup: "popup.html",
    };
  }

  manifest.manifest_version = 3;

  if (entryPoints.contentScripts) {
    manifest.content_scripts = entryPoints.contentScripts.map((cs, index) => {
      const csEntry: ContentScript = {
        matches: cs.matches,
        js: [`content_${index}.js`],
      };
      const cssFile = `content_${index}.css`;
      if (existsSync(resolve(buildOptions.outputDir, cssFile))) {
        csEntry.css = [cssFile];
      }
      return csEntry;
    });
  }

  const webAccessibleResources = [];
  if (entryPoints.contentScripts) {
    webAccessibleResources.push(
      ...entryPoints.contentScripts
        .filter((cs) => cs.staticDir !== null)
        .map((cs) => ({
          resources: [cs.staticDir + "/*"],
          matches: cs.matches,
        }))
    );
  }
  if (entryPoints.additionalScripts) {
    webAccessibleResources.push(
      ...Object.entries(entryPoints.additionalScripts).map(
        ([name, { matches }]) => ({
          resources: [name + ".js"],
          matches,
        })
      )
    );
  }
  if (webAccessibleResources.length > 0) {
    manifest.web_accessible_resources = webAccessibleResources;
  }

  writeFileSync(
    resolve(buildOptions.outputDir, "manifest.json"),
    JSON.stringify(manifest, null, "    "),
    "utf-8"
  );
};

const clearDist = ({ buildOptions: { outputDir } }: Config) => {
  rmSync(outputDir, { recursive: true, force: true });
};

const getBuildOptions = (config: Config, sourceDir: string, keys: Keys) => {
  const entryPoints = [];
  if (config.entryPoints.popup) {
    entryPoints.push({
      in: resolve(
        sourceDir,
        config.buildOptions.sourceRoot ?? ".",
        config.entryPoints.popup
      ),
      out: "popup",
    });
  }
  if (config.entryPoints.backgroundScript) {
    entryPoints.push({
      in: resolve(
        sourceDir,
        config.buildOptions.sourceRoot ?? ".",
        config.entryPoints.backgroundScript
      ),
      out: "background",
    });
  }
  if (config.entryPoints.contentScripts) {
    config.entryPoints.contentScripts.forEach((cs, index) => {
      entryPoints.push({
        in: resolve(
          sourceDir,
          config.buildOptions.sourceRoot ?? ".",
          cs.location
        ),
        out: "content_" + index,
      });
    });
  }

  if (config.entryPoints.additionalScripts) {
    Object.entries(config.entryPoints.additionalScripts).forEach(
      ([name, { location, matches }]) => {
        entryPoints.push({
          in: resolve(
            sourceDir,
            config.buildOptions.sourceRoot ?? ".",
            location
          ),
          out: name,
        });
      }
    );
  }

  const buildOptions: any = {
    entryPoints,
    bundle: true,
    outdir: resolve(sourceDir, config.buildOptions.outputDir),
  };

  if (config.buildOptions.fontExtensions) {
    buildOptions.loader = Object.fromEntries(
      config.buildOptions.fontExtensions?.map((ext) => ["." + ext, "dataurl"])
    );
  }

  buildOptions.plugins = [
    {
      name: "post-build",
      setup(build: any) {
        build.onEnd(() => {
          writePopup(config);
          writeManifest(keys, config);
          copyStaticFiles(sourceDir, config);
          if (config.buildOptions.postBuildScript) {
            execSync(`esr ${config.buildOptions.postBuildScript}`);
          }
          Log.success("Built chrome extension.");
        });
      },
    },
  ];

  return buildOptions;
};

const writePopup = ({ entryPoints, buildOptions: { outputDir } }: Config) => {
  if (entryPoints.popup)
    writeFileSync(
      resolve(outputDir, "popup.html"),
      `<html>
<head>
    <script src="/popup.js" defer ></script>
</head>
<body>
    <div id="root"></div>
</body>
</html>`
    );
};

const copyStaticFiles = (
  sourceDir: string,
  { entryPoints, buildOptions }: Config
) => {
  entryPoints.contentScripts?.forEach((cs) => {
    if (cs.staticDir) {
      cpSync(
        resolve(sourceDir, buildOptions.sourceRoot ?? ".", cs.staticDir),
        resolve(buildOptions.outputDir, cs.staticDir),
        { recursive: true }
      );
    }
  });
};

const loadConfig = (sourceDir: string): Config => {
  const configFile = resolve(sourceDir, ".crxrc.json");

  if (existsSync(configFile)) {
    return JSON.parse(readFileSync(configFile, "utf-8"));
  } else {
    throw new Error("Missing config file.");
  }
};

const loadKeys = (sourceDir: string) => {
  const keysDir = resolve(sourceDir, "keys");
  try {
    if (!existsSync(keysDir)) {
      Log.error(
        `Failed to load private key; ${keysDir} does not exist. Aborting.`
      );
      process.exit(1);
    }
    return new Keys(keysDir);
  } catch (e) {
    Log.error("Failed to load private key; aborted.", e);
    process.exit(1);
  }
};

export const build = () => {
  try {
    Log.info("Creating new build");
    const sourceDir = process.cwd();
    const config = loadConfig(sourceDir);
    const keys = loadKeys(sourceDir);
    clearDist(config);
    const buildOptions = getBuildOptions(config, sourceDir, keys);
    esbuild.build(buildOptions).catch((e) => {
      Log.error("Failed to build chrome extension", e);
      process.exit(1);
    });
  } catch (e) {
    Log.error("Failed to build chrome extension", e);
    process.exit(1);
  }
};

export const watch = () => {
  try {
    Log.info("Creating new build");
    const sourceDir = process.cwd();
    const config = loadConfig(sourceDir);
    const keys = loadKeys(sourceDir);
    clearDist(config);
    const buildOptions = getBuildOptions(config, sourceDir, keys);

    esbuild.context(buildOptions).then((ctx) => {
      ctx.watch();
      ctx.serve();
    });
  } catch (e) {
    Log.error("Failed to build chrome extension", e);
    process.exit(1);
  }
};
