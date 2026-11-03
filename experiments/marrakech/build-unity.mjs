import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateNativePatina } from "./native-patina.mjs";
import { generateNativeInstances } from "./native-instances.mjs";
import { generateNativeWater } from "./native-water.mjs";
import { parseArgs } from "node:util";
import { getStudy } from "./web/scenes.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: { scene: { type: "string", default: "marrakech" } },
});
const study = getStudy(values.scene);
const project = path.join(directory, "unity");
const version = (
  await readFile(
    path.join(project, "ProjectSettings/ProjectVersion.txt"),
    "utf8",
  )
).match(/^m_EditorVersion: (.+)$/m)?.[1];
const editor =
  process.env.UNITY_EDITOR ??
  (process.platform === "darwin" && version
    ? `/Applications/Unity/Hub/Editor/${version}/Unity.app/Contents/MacOS/Unity`
    : null);
if (!editor)
  throw new Error("Set UNITY_EDITOR to the Unity Editor executable.");
const output = path.resolve(
  directory,
  "../../outputs/engine-comparison",
  study.outdoor ? study.sceneId : ".",
);
await mkdir(output, { recursive: true });
function run(method, quit, log) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      editor,
      [
        "-batchmode",
        "-projectPath",
        project,
        "-executeMethod",
        method,
        "-study",
        study.id,
        "-logFile",
        path.join(output, log),
        ...(quit ? ["-quit"] : []),
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${method} failed (${code}); inspect ${log}.`)),
    );
  });
}
// A separate Editor process resets glTFast's cached render-pipeline selection.
console.log("Configuring URP before importing materials.");
await generateNativeWater(project);
await run("BuildStudy.Configure", true, "unity-configure.log");
await generateNativePatina(project);
await generateNativeInstances(project);
console.log(
  `Unity Web build started. Log: ${path.join(output, "unity-build.log")}`,
);
await run("BuildStudy.Build", false, "unity-build.log");
console.log("Unity Web build completed.");
