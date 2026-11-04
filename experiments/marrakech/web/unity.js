import { script } from "/src/client/rendering/common.js";

export async function start(canvas, manifest) {
  const root = manifest.study.unityRoot;
  const player = manifest.study.outdoor ? manifest.study.id : "Build";
  const response = await fetch(`${root}Build/${player}.loader.js`, {
    method: "HEAD",
  });
  if (!response.ok) throw new Error("Unity Web build is not present yet");
  await script(`${root}Build/${player}.loader.js`);
  const instance = await window.createUnityInstance(canvas, {
    dataUrl: `${root}Build/${player}.data`,
    frameworkUrl: `${root}Build/${player}.framework.js`,
    codeUrl: `${root}Build/${player}.wasm`,
    streamingAssetsUrl: `${root}StreamingAssets`,
    companyName: "Diorama Atlas",
    productName: `${manifest.study.title} engine study`,
    productVersion: "1",
    matchWebGLToCanvasSize: true,
    devicePixelRatio: Math.min(devicePixelRatio, 1.5),
  });
  return {
    view(view) {
      instance.SendMessage("Study", "SetView", JSON.stringify(view));
    },
    pause(paused) {
      instance.SendMessage("Study", "SetPaused", String(paused));
    },
    resize() {
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
    },
    dispose() {
      return instance.Quit();
    },
    get fps() {
      return window.__unityStudy?.fps ?? null;
    },
    get inspection() {
      return window.__unityStudy;
    },
  };
}
