import * as util from "util";
import { relative, resolve } from "path";
import * as process from "process";
import { Log } from "./script-logging";
import { Ora } from "ora";

const exec = util.promisify(require("child_process").exec);
const appendFile = util.promisify(require("fs").appendFile);
const cp = util.promisify(require("fs").cp);
const exists = util.promisify(require("fs").exists);
const mkdir = util.promisify(require("fs").mkdir);
const readFile = util.promisify(require("fs").readFile);
const writeFile = util.promisify(require("fs").writeFile);

const deps = [
  "esbuild",
  "eslint",
  "eslint-config-prettier",
  "eslint-config-react-app",
  "eslint-plugin-prettier",
  "prettier",
  "react",
  "react-dom",
  "typescript",
  "@types/chrome",
  "@types/react",
  "@types/react-dom",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
];

const installDependencies = async () => {
  await Log.spinner(
    `Installing dependencies...`,
    async (spinner: Ora) => {
      for (const dep of deps) {
        spinner.text = `Installing dependencies...${dep}`;
        await exec(`yarn add ${dep}`);
      }
    },
    "Installing dependencies"
  );
};

const createTsConfig = async (projectRoot: string) => {
  const tsConfigLocation = resolve(projectRoot, "tsconfig.json");

  const tsConfig = {
    compilerOptions: {
      target: "es6",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      jsx: "react-jsx",
      module: "esnext",
      rootDir: "src",
      moduleResolution: "node",
      isolatedModules: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
    },
  };

  await writeFile(
    tsConfigLocation,
    JSON.stringify(tsConfig, null, "  "),
    "utf-8"
  );
};

const createPackageJson = async (projectRoot: string) => {
  const packageJsonLocation = resolve(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonLocation, "utf-8"));
  packageJson.eslintConfig = {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
    ],
  };

  // Take out these lines before publishing:
  packageJson.resolutions = {
    "@crx/scripts": "portal:/Users/eli/Code/cx-template/scripts",
  };

  packageJson.dependencies["@crx/scripts"] = "0.0.1";

  packageJson.scripts = {
    build: "crx-scripts build",
    setup: "crx-scripts setup",
    watch: "crx-scripts watch",
  };
  await writeFile(
    packageJsonLocation,
    JSON.stringify(packageJson, null, "  "),
    "utf-8"
  );
};

const initYarn = async () => {
  await exec("yarn set version berry");
  await exec("yarn init");
};

const createProjectDirectory = async (projectRoot: string) => {
  try {
    await Log.spinner("Creating project directory", async () => {
      if (await exists(projectRoot)) {
        throw new Error("Project directory is not empty");
      } else {
        await mkdir(projectRoot);
      }
    });
  } catch (e) {
    if ((e as any).message === "Project directory is not empty") {
      Log.error(`'${projectRoot}' is not an empty directory. Aborting.`);
      process.exit(1);
    } else {
      Log.error(`Failed to create project directory`, e);
      process.exit(1);
    }
  }
};

const copyTemplateFiles = async (projectRoot: string) => {
  const source = resolve(__dirname, "./../template");
  await Log.spinner(`Copying from '${source}' to ${projectRoot}`, async () => {
    await cp(source, projectRoot, { recursive: true });
  });
};

const updateGitIgnore = async (projectRoot: string) => {
  const gitIgnoreLines = ["\n", "dist/", "keys/"];
  await appendFile(
    resolve(projectRoot, ".gitignore"),
    gitIgnoreLines.join("\n"),
    "utf-8"
  );
};

export const createApp = (name: string) => {
  const createAppTasks = async () => {
    const projectRoot = resolve(relative(process.cwd(), name));
    await createProjectDirectory(projectRoot);
    process.chdir(projectRoot);
    await Log.spinner("Initializing yarn project", () => initYarn());
    await copyTemplateFiles(projectRoot);
    await installDependencies();
    await Log.spinner("Setting up project files", async () => {
      await createPackageJson(projectRoot);
      await createTsConfig(projectRoot);
      await updateGitIgnore(projectRoot);
    });

    // Remove this before publish
    await exec("yarn");
  };
  createAppTasks()
    .then(() => Log.success(`Created new project: ${name}`))
    .catch((e) => {
      Log.error("Failed to create app", e);
    });
};
