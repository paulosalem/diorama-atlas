import { loadAudioLibrary } from "./audio-library.js";

const between = ([min, max]) => min + Math.random() * (max - min);

/** Each playback owns its requests, decoded buffers, graph, and scheduler. */
export function createRecordedSoundscape(profile) {
  let current = null;
  let state = "idle";
  let errorMessage = "";
  let notice = "";
  let volume = 0.55;
  let ducked = false;
  const subscribers = new Set();
  const notify = () => subscribers.forEach((listener) => listener());

  function release(session) {
    if (session.released) return;
    session.released = true;
    session.abort.abort();
    clearInterval(session.timer);
    clearTimeout(session.timeout);
    clearTimeout(session.resumeTimeout);
    session.context.onstatechange = null;
    session.master.disconnect();
    for (const source of session.sources) {
      source.onended = null;
      source.stop();
    }
    for (const node of session.nodes) node.disconnect();
    session.sources.clear();
    session.nodes.clear();
    session.layers.length = 0;
    if (session.context.state !== "closed")
      session.context.close().catch((error) => {
        console.error("Could not close the soundscape audio context.", error);
      });
  }

  function stop(nextState = "idle", message = "") {
    const session = current;
    current = null;
    if (session) release(session);
    if (state !== "disposed") {
      state = nextState;
      errorMessage = "";
      notice = message;
      notify();
    }
  }

  function own(session, node) {
    session.nodes.add(node);
    return node;
  }

  function mix() {
    if (!current) return;
    const gain = current.master.gain;
    gain.cancelScheduledValues(current.context.currentTime);
    gain.setTargetAtTime(
      volume * (ducked ? 0.22 : 1),
      current.context.currentTime,
      0.12,
    );
  }

  function voice(session, layer, when) {
    const { context } = session;
    const source = own(session, context.createBufferSource());
    const envelope = own(session, context.createGain());
    source.buffer = layer.buffer;
    const duration = layer.buffer.duration;
    const fade = layer.mode === "loop" ? Math.min(2.5, duration / 5) : 0.025;
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(1, when + fade);
    envelope.gain.setValueAtTime(1, when + duration - fade);
    envelope.gain.linearRampToValueAtTime(0, when + duration);
    source.connect(envelope).connect(layer.input);
    session.sources.add(source);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      session.sources.delete(source);
      session.nodes.delete(source);
      session.nodes.delete(envelope);
    };
    source.start(when);
    source.stop(when + duration);
    return duration - fade;
  }

  function schedule(session) {
    if (current !== session || state !== "playing") return;
    const now = session.context.currentTime;
    for (const layer of session.layers) {
      if (layer.next > now + 0.6) continue;
      const when = Math.max(now + 0.02, layer.next);
      const step = voice(session, layer, when);
      layer.next =
        when +
        (layer.mode === "loop"
          ? step
          : layer.buffer.duration + between(layer.interval));
    }
  }

  async function start({ automatic = false } = {}) {
    if (state === "disposed")
      throw new Error("This soundscape has been disposed.");
    if (current) return current.starting;
    if (document.hidden) {
      stop("paused");
      return;
    }
    let session;
    try {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      master.connect(limiter).connect(context.destination);
      session = {
        context,
        master,
        abort: new AbortController(),
        nodes: new Set([master, limiter]),
        sources: new Set(),
        layers: [],
        released: false,
      };
      current = session;
      state = "loading";
      errorMessage = "";
      notice = "";
      notify();
      // Resume before any fetch/await: browsers require the enabling gesture.
      const resumed = context.resume();
      session.timeout = setTimeout(() => session.abort.abort(), 30_000);
      session.starting = (async () => {
        try {
          const waiting = [
            resumed,
            new Promise((resolve, reject) => {
              session.abort.signal.addEventListener(
                "abort",
                () => {
                  reject(
                    new DOMException(
                      "Audio loading was interrupted.",
                      "AbortError",
                    ),
                  );
                },
                { once: true },
              );
            }),
          ];
          if (automatic)
            waiting.push(
              new Promise((resolve) => {
                session.resumeTimeout = setTimeout(
                  () => resolve("gesture-required"),
                  500,
                );
              }),
            );
          const result = await Promise.race(waiting);
          clearTimeout(session.resumeTimeout);
          if (current !== session) return;
          if (result === "gesture-required") {
            stop(
              "paused",
              "Your choice is saved. Select Resume to allow browser playback.",
            );
            return;
          }
          const assets = await loadAudioLibrary();
          if (current !== session) return;
          session.abort.signal.throwIfAborted();
          const buffers = new Map();
          await Promise.all(
            [...new Set(profile.layers.map((layer) => layer.asset))].map(
              async (id) => {
                const asset = assets.find((entry) => entry.id === id);
                if (!asset)
                  throw new Error(`Missing soundscape recording: ${id}.`);
                const response = await fetch(asset.file, {
                  signal: session.abort.signal,
                });
                if (!response.ok)
                  throw new Error(
                    `${asset.title} could not load (${response.status}).`,
                  );
                const buffer = await context.decodeAudioData(
                  await response.arrayBuffer(),
                );
                if (buffer.duration < 0.1)
                  throw new Error(`${asset.title} is too short to play.`);
                buffers.set(id, buffer);
              },
            ),
          );
          if (current !== session) return;
          if (session.abort.signal.aborted)
            throw new Error("Soundscape loading timed out. Try again.");
          if (context.state !== "running")
            throw new Error(
              "Playback was blocked. Enable sound again to retry.",
            );
          for (const specification of profile.layers) {
            const input = own(session, context.createGain());
            input.gain.value = specification.level;
            const filter = own(session, context.createBiquadFilter());
            filter.type = "lowpass";
            filter.frequency.value = specification.cutoff ?? 14000;
            input.connect(filter);
            if (specification.position) {
              const pan = own(session, context.createPanner());
              pan.panningModel = "HRTF";
              pan.distanceModel = "inverse";
              pan.refDistance = specification.refDistance ?? 3;
              pan.rolloffFactor = 0.65;
              [pan.positionX.value, pan.positionY.value, pan.positionZ.value] =
                specification.position;
              filter.connect(pan).connect(master);
            } else filter.connect(master);
            session.layers.push({
              ...specification,
              buffer: buffers.get(specification.asset),
              input,
              filter,
              next:
                context.currentTime +
                (specification.mode === "loop"
                  ? 0.05
                  : between(specification.interval)),
            });
          }
          state = "playing";
          mix();
          schedule(session);
          session.timer = setInterval(() => schedule(session), 250);
          context.onstatechange = () => {
            if (current === session && context.state !== "running")
              stop("paused");
          };
          notify();
        } finally {
          clearTimeout(session.timeout);
        }
      })();
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden && current === session) stop("paused");
        },
        { signal: session.abort.signal },
      );
      window.addEventListener("pagehide", () => stop("paused"), {
        signal: session.abort.signal,
      });
      await session.starting;
    } catch (error) {
      if (session && current !== session) return;
      if (session) {
        current = null;
        release(session);
      }
      state = "error";
      errorMessage =
        error.name === "AbortError"
          ? "Soundscape loading timed out. Try again."
          : error.message;
      notify();
      throw new Error(errorMessage, { cause: error });
    }
  }

  return {
    profile,
    start,
    stop: () => stop(),
    pause: (message) => stop("paused", message),
    setVolume(value) {
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new RangeError("Soundscape volume must be between zero and one.");
      volume = value;
      mix();
    },
    setDucked(value) {
      ducked = value;
      mix();
    },
    update(camera) {
      if (!current || state !== "playing") return;
      camera.updateMatrixWorld();
      const e = camera.matrixWorld.elements;
      const listener = current.context.listener;
      const values = [
        e[12],
        e[13],
        e[14],
        -e[8],
        -e[9],
        -e[10],
        e[4],
        e[5],
        e[6],
      ];
      const parameters = [
        listener.positionX,
        listener.positionY,
        listener.positionZ,
        listener.forwardX,
        listener.forwardY,
        listener.forwardZ,
        listener.upX,
        listener.upY,
        listener.upZ,
      ];
      parameters.forEach((parameter, index) => {
        parameter.setTargetAtTime(
          values[index],
          current.context.currentTime,
          0.08,
        );
      });
      for (const layer of current.layers) {
        const behindPortal =
          layer.portalZ !== undefined &&
          e[14] < layer.portalZ !== layer.position[2] < layer.portalZ;
        layer.filter.frequency.setTargetAtTime(
          behindPortal ? 1200 : (layer.cutoff ?? 14000),
          current.context.currentTime,
          0.15,
        );
      }
    },
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    get active() {
      return state === "playing";
    },
    get status() {
      return { state, error: errorMessage, notice, volume, ducked };
    },
    get inspection() {
      const buffers = new Set(current?.layers.map((layer) => layer.buffer));
      return {
        state,
        sources: current?.sources.size ?? 0,
        nodes: current?.nodes.size ?? 0,
        contextState: current?.context.state ?? "closed",
        bufferBytes: [...buffers].reduce(
          (sum, buffer) => sum + buffer.length * buffer.numberOfChannels * 4,
          0,
        ),
      };
    },
    dispose() {
      if (state === "disposed") return;
      stop();
      state = "disposed";
      notify();
      subscribers.clear();
    },
  };
}
