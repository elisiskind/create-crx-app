import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { promisify } from "util";
import { Log } from "./script-logging";

import { exec as exec0 } from "node:child_process";

const exec = promisify(exec0);
import NodeRSA = require("node-rsa");

export class Keys {
  privateKey: NodeRSA;
  extensionId: string;
  publicKey: string;

  constructor(dir: string) {
    this.privateKey = Keys.loadPrivateKey(dir);
    this.publicKey = Keys.generatePublicKey(this.privateKey);
    this.extensionId = Keys.generateExtensionId(this.privateKey);
  }

  private static loadPrivateKey = (dir: string) => {
    return new NodeRSA(readFileSync(resolve(dir, "key.pem"), "utf-8"));
  };

  private static generateExtensionId = (privateKey: NodeRSA) => {
    const publicKey = privateKey.exportKey("pkcs8-public-der");
    return createHash("sha256")
      .update(publicKey)
      .digest()
      .toString("hex")
      .split("")
      .map((x) => (parseInt(x, 16) + 0x0a).toString(26))
      .join("")
      .slice(0, 32);
  };

  private static generatePublicKey = (privateKey: NodeRSA) => {
    return privateKey
      .exportKey("pkcs8-public")
      .split("\n")
      .filter((s) => !s.includes("-----"))
      .join("");
  };
}

const generateKeys = async (keysDir: string) => {
  return exec(`ssh-keygen -b 4096 -t rsa -f ${keysDir}/key.pem -m pem -N ''`);
};

const createFolder = () => {
  const dir = resolve("keys");
  if (existsSync(dir)) {
    Log.error("Directory 'keys' already exists; aborting");
    process.exit(1);
  } else {
    mkdirSync(dir);
  }
  return dir;
};

export const setupKeys = () => {
  Log.spinner("Generating keys", async () => {
    const keysDir = createFolder();
    await generateKeys(keysDir);
    return keysDir;
  })
    .then((keysDir) => {
      Log.success(`Created private/public key pair in ${keysDir}`);
    })
    .catch((e) => {
      Log.error("Failed to generate keys", e);
      process.exit(1);
    });
};
