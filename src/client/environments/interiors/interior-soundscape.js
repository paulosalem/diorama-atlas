const PROFILES = {
  cafe: {
    layers: [
      [280, 0.038, -0.35],
      [1800, 0.012, 0.4],
    ],
    event: [2300, 0.035, 0.18],
    interval: [5, 13],
  },
  tavern: {
    layers: [
      [220, 0.042, 0.2],
      [1250, 0.014, -0.5],
    ],
    event: [1700, 0.035, 0.25],
    interval: [7, 16],
  },
  herbshop: {
    layers: [
      [420, 0.024, -0.55],
      [2300, 0.01, 0.3],
    ],
    event: [2900, 0.03, 0.65],
    interval: [8, 18],
  },
  bookshop: {
    layers: [
      [190, 0.024, -0.25],
      [950, 0.008, 0.55],
    ],
    event: [1900, 0.025, 0.8],
    interval: [12, 23],
  },
  workshop: {
    layers: [
      [520, 0.026, -0.6],
      [1600, 0.012, 0.2],
    ],
    event: [1150, 0.035, 0.45],
    interval: [9, 19],
  },
  kitchen: {
    layers: [
      [320, 0.05, 0.45],
      [2600, 0.025, -0.65],
    ],
    event: [1800, 0.045, 0.07],
    interval: [1.8, 4.8],
  },
};

const between = (min, max) => min + Math.random() * (max - min);

/**
 * Local, non-musical room textures. No audio resources exist until start().
 * stop() and dispose() silence synchronously; context closure finishes asynchronously.
 */
export function createInteriorSoundscape(type) {
  const profile = PROFILES[type];
  if (!profile) throw new RangeError(`Unknown interior soundscape: ${type}`);

  let current = null;
  let state = "uninitialized";
  let disposed = false;
  const report = (error) =>
    console.error(`Interior ${type} soundscape:`, error);

  function disconnect(session, nodes) {
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch (error) {
        report(error);
      }
      session.nodes.delete(node);
    }
  }

  function release(session) {
    if (session.released) return;
    session.released = true;
    clearTimeout(session.timer);
    document.removeEventListener("visibilitychange", session.onVisibility);
    globalThis.removeEventListener("pagehide", session.onPageHide);
    session.context.removeEventListener("statechange", session.onStateChange);
    // Disconnect first: even a pending resume cannot make an obsolete session audible.
    disconnect(session, [...session.nodes]);
    for (const source of session.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch (error) {
        report(error);
      }
    }
    session.sources.clear();
    if (session.context.state !== "closed") {
      try {
        session.context.close().catch(report);
      } catch (error) {
        report(error);
      }
    }
  }

  function stop() {
    const session = current;
    current = null;
    if (!disposed) state = "suspended";
    if (session) release(session);
  }

  function own(session, node) {
    session.nodes.add(node);
    return node;
  }

  function noiseBuffer(context) {
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 8,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.023) / 1.023;
      data[i] = brown * 3.5 + white * 0.12;
    }
    // A short loop seam crossfade avoids a click every eight seconds.
    const seam = Math.floor(context.sampleRate * 0.08);
    for (let i = 0; i < seam; i++) {
      const mix = i / seam;
      data[data.length - seam + i] =
        data[data.length - seam + i] * (1 - mix) + data[i] * mix;
    }
    return buffer;
  }

  function noise(session, { frequency, level, pan, duration = null }) {
    const { context } = session;
    const source = own(session, context.createBufferSource());
    const filter = own(session, context.createBiquadFilter());
    const gain = own(session, context.createGain());
    const stereo = own(session, context.createStereoPanner());
    source.buffer = session.buffer;
    source.loop = duration === null;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.55;
    stereo.pan.value = pan;
    source
      .connect(filter)
      .connect(gain)
      .connect(stereo)
      .connect(session.master);
    const now = context.currentTime;
    if (duration !== null) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + duration * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
      source.onended = () => {
        try {
          session.sources.delete(source);
          disconnect(session, [source, filter, gain, stereo]);
        } catch (error) {
          report(error);
        }
      };
    } else {
      gain.gain.value = level;
      session.beds.push({
        gain,
        level,
        filter,
        frequency,
        phase: between(0, 6),
      });
    }
    session.sources.add(source);
    source.start(now, between(0.1, 5));
    if (duration !== null) source.stop(now + duration + 0.025);
  }

  function bird(session) {
    const { context } = session;
    const oscillator = own(session, context.createOscillator());
    const gain = own(session, context.createGain());
    const stereo = own(session, context.createStereoPanner());
    const now = context.currentTime;
    const pitch = between(2300, 2900);
    oscillator.frequency.setValueAtTime(pitch, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      pitch * 1.45,
      now + 0.075,
    );
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.86, now + 0.22);
    gain.gain.setValueAtTime(0.00001, now);
    gain.gain.exponentialRampToValueAtTime(0.003, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.23);
    stereo.pan.value = -0.7;
    oscillator.connect(gain).connect(stereo).connect(session.master);
    oscillator.onended = () => {
      try {
        session.sources.delete(oscillator);
        disconnect(session, [oscillator, gain, stereo]);
      } catch (error) {
        report(error);
      }
    };
    session.sources.add(oscillator);
    oscillator.start(now);
    oscillator.stop(now + 0.25);
  }

  function schedule(session) {
    session.timer = setTimeout(
      () => {
        if (current !== session || session.released) return;
        try {
          if (document.hidden) {
            stop();
            return;
          }
          const now = session.context.currentTime;
          for (const bed of session.beds) {
            const drift = Math.sin(now * 0.13 + bed.phase);
            bed.gain.gain.setTargetAtTime(
              bed.level * (0.9 + drift * 0.1),
              now,
              2,
            );
            bed.filter.frequency.setTargetAtTime(
              bed.frequency * (1 + drift * 0.08),
              now,
              2,
            );
          }
          const [frequency, level, duration] = profile.event;
          noise(session, {
            frequency: frequency * between(0.75, 1.25),
            level: level * between(0.5, 1),
            duration: duration * between(0.7, 1.4),
            pan: between(-0.6, 0.6),
          });
          if (type === "kitchen" && now >= session.nextBird) {
            bird(session);
            session.nextBird = now + between(17, 34);
          }
          schedule(session);
        } catch (error) {
          report(error);
          stop();
          state = "error";
        }
      },
      between(...profile.interval) * 1000,
    );
  }

  async function initialize(session) {
    try {
      const { context } = session;
      session.master = own(session, context.createGain());
      session.master.gain.value = 0;
      session.analyser = own(session, context.createAnalyser());
      session.analyser.fftSize = 512;
      session.meter = new Float32Array(session.analyser.fftSize);
      session.master.connect(session.analyser).connect(context.destination);
      session.buffer = noiseBuffer(context);
      for (const [frequency, level, pan] of profile.layers)
        noise(session, { frequency, level, pan });

      await context.resume();
      if (current !== session || session.released) return;
      if (document.hidden) {
        stop();
        return;
      }
      if (context.state !== "running")
        throw new Error(
          "Audio playback did not become available. Try enabling sound again.",
        );
      session.ready = true;
      state = "running";
      session.master.gain.setTargetAtTime(0.65, context.currentTime, 0.45);
      schedule(session);
    } catch (error) {
      // A rejected resume after mute/dispose is cancellation, not a playback failure.
      if (current !== session || session.released) return;
      current = null;
      state = "error";
      release(session);
      throw error;
    }
  }

  async function start() {
    if (disposed)
      throw new Error("This interior soundscape has been disposed.");
    if (current?.ready && current.context.state !== "running") stop();
    if (current) return current.startPromise;
    if (document.hidden) {
      state = "suspended";
      return;
    }
    const AudioContextConstructor = globalThis.AudioContext;
    if (!AudioContextConstructor) {
      state = "error";
      throw new Error("This browser does not support local audio playback.");
    }
    let context;
    try {
      context = new AudioContextConstructor();
    } catch (error) {
      state = "error";
      throw error;
    }
    const session = {
      context,
      nodes: new Set(),
      sources: new Set(),
      beds: [],
      released: false,
      ready: false,
      nextBird: between(12, 22),
    };
    current = session;
    state = "starting";
    session.onVisibility = () => {
      if (document.hidden && current === session) stop();
    };
    session.onPageHide = () => {
      if (current === session) stop();
    };
    session.onStateChange = () => {
      if (session.ready && current === session && context.state !== "running")
        stop();
    };
    document.addEventListener("visibilitychange", session.onVisibility);
    globalThis.addEventListener("pagehide", session.onPageHide);
    context.addEventListener("statechange", session.onStateChange);
    session.startPromise = initialize(session);
    return session.startPromise;
  }

  function sampleLevel() {
    if (!current?.ready || current.context.state !== "running") return 0;
    current.analyser.getFloatTimeDomainData(current.meter);
    let sum = 0;
    for (const sample of current.meter) sum += sample * sample;
    return Math.sqrt(sum / current.meter.length);
  }

  return {
    start,
    stop,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      state = "disposed";
    },
    update() {},
    get active() {
      return Boolean(current?.ready && current.context.state === "running");
    },
    get state() {
      return state;
    },
    get level() {
      return sampleLevel();
    },
    get diagnostics() {
      return {
        state,
        contextState: current?.context.state ?? "closed",
        currentTime: current?.context.currentTime ?? 0,
        sources: current?.sources.size ?? 0,
        nodes: current?.nodes.size ?? 0,
        rms: sampleLevel(),
      };
    },
  };
}
