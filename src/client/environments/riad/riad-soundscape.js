/** A quiet, local soundscape. Nothing plays until the visitor asks for sound. */
export function createRiadSoundscape() {
  let context = null,
    master = null,
    running = false,
    timer = null,
    suspendTimer = null;
  const sources = [];
  let fountainGain, windGain;
  function noise(seconds = 5) {
    const buffer = context.createBuffer(
        1,
        context.sampleRate * seconds,
        context.sampleRate,
      ),
      data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.035) / 1.035;
      data[i] = brown * 3.5 + white * 0.11;
    }
    return buffer;
  }
  function bed(buffer, frequency, q, gain, pan) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const volume = context.createGain();
    volume.gain.value = gain;
    const stereo = context.createStereoPanner();
    stereo.pan.value = pan;
    source.connect(filter).connect(volume).connect(stereo).connect(master);
    source.start();
    sources.push(source);
    return volume;
  }
  function droplet(now) {
    const osc = context.createOscillator(),
      gain = context.createGain(),
      pan = context.createStereoPanner();
    const f = 1100 + Math.random() * 1600;
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.53, now + 0.09);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(
      0.004 + Math.random() * 0.006,
      now + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    pan.pan.value = -0.3 + Math.random() * 0.25;
    osc.connect(gain).connect(pan).connect(master);
    osc.start(now);
    osc.stop(now + 0.15);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  }
  function bird(now) {
    const osc = context.createOscillator(),
      gain = context.createGain(),
      pan = context.createStereoPanner();
    const f = 2300 + Math.random() * 800;
    osc.frequency.setValueAtTime(f, now);
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.13;
      osc.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.035);
      osc.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.1);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.0025, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    }
    pan.pan.value = 0.65;
    osc.connect(gain).connect(pan).connect(master);
    osc.start(now);
    osc.stop(now + 0.41);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  }
  function schedule() {
    if (!running) return;
    const now = context.currentTime;
    for (let i = 0; i < 5; i++) droplet(now + i * 0.22 + Math.random() * 0.12);
    if (Math.random() < 0.12) bird(now + 0.4);
    timer = setTimeout(schedule, 1200);
  }
  async function start() {
    if (running) return;
    clearTimeout(suspendTimer);
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      const buffer = noise();
      fountainGain = bed(buffer, 1900, 0.45, 0.26, -0.2);
      bed(buffer, 570, 0.6, 0.14, -0.1);
      windGain = bed(buffer, 340, 0.35, 0.06, 0.45);
      const lfo = context.createOscillator(),
        depth = context.createGain();
      lfo.frequency.value = 0.12;
      depth.gain.value = 0.018;
      lfo.connect(depth).connect(windGain.gain);
      lfo.start();
      sources.push(lfo);
    }
    await context.resume();
    running = true;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0.72, context.currentTime, 0.4);
    schedule();
  }
  function stop() {
    running = false;
    clearTimeout(timer);
    if (context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, 0.12);
      suspendTimer = setTimeout(() => {
        if (!running && context?.state === "running") context.suspend();
      }, 700);
    }
  }
  function update(camera) {
    if (!context || !running) return;
    const d = Math.hypot(camera.position.x, camera.position.z + 0.35);
    fountainGain.gain.setTargetAtTime(
      0.31 / (1 + d * 0.11),
      context.currentTime,
      0.4,
    );
  }
  function dispose() {
    stop();
    clearTimeout(suspendTimer);
    sources.forEach((s) => s.stop());
    context?.close();
    context = null;
  }
  return {
    start,
    stop,
    update,
    dispose,
    get active() {
      return running;
    },
    get state() {
      return context?.state ?? "uninitialized";
    },
  };
}
