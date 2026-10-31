"use strict";
function createPhaseEngine() {
  const limiter = new Tone.Limiter(-3).toDestination();
  const master = new Tone.Gain(0).connect(limiter);
  const channels = {},
    fx = {};
  const delay = () =>
    new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.14, wet: 0 });
  const room = () =>
    new Tone.Freeverb({ roomSize: 0.38, dampening: 4600, wet: 0 });
  fx.lead = [delay(), room()];
  fx.bass = [
    new Tone.Distortion({ distortion: 0.12, wet: 0 }),
    new Tone.Chorus({
      frequency: 0.6,
      delayTime: 2,
      depth: 0.18,
      wet: 0,
    }).start(),
  ];
  fx.drums = [
    new Tone.Distortion({ distortion: 0.1, wet: 0 }),
    new Tone.Freeverb({ roomSize: 0.22, dampening: 5500, wet: 0 }),
  ];
  fx.percussion = [delay(), room()];
  for (const ch of Object.keys(Phase.channels)) {
    channels[ch] = new Tone.Channel({ mute: !Phase.enabled[ch] }).connect(
      master,
    );
    fx[ch][0].chain(fx[ch][1], channels[ch]);
  }
  const leadFilter = new Tone.Filter(3200, "lowpass").connect(fx.lead[0]);
  const chorus = new Tone.Chorus({
    frequency: 0.8,
    delayTime: 2.5,
    depth: 0.25,
    wet: 0.16,
  })
    .start()
    .connect(leadFilter);
  const answerFilter = new Tone.Filter(2100, "lowpass").connect(chorus);
  const lead = new Tone.Synth({
    oscillator: { type: "fatsawtooth", count: 2, spread: 7 },
    envelope: { attack: 0.012, decay: 0.13, sustain: 0.23, release: 0.05 },
  }).connect(chorus);
  const answer = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.008, decay: 0.17, sustain: 0.12, release: 0.12 },
    volume: -3,
  }).connect(answerFilter);
  const bassFilter = new Tone.Filter(850, "lowpass").connect(fx.bass[0]);
  const bass = new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    filter: { type: "lowpass", Q: 1.1, rolloff: -24 },
    envelope: { attack: 0.007, decay: 0.12, sustain: 0.17, release: 0.06 },
    filterEnvelope: {
      attack: 0.005,
      decay: 0.12,
      sustain: 0.1,
      release: 0.06,
      baseFrequency: 110,
      octaves: 2.2,
    },
  }).connect(bassFilter);
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.035,
    octaves: 5,
    envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.04 },
  }).connect(fx.drums[0]);
  const snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.025 },
    volume: -11,
  }).connect(new Tone.Filter(1600, "highpass").connect(fx.drums[0]));
  const snareBody = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    volume: -20,
  }).connect(fx.drums[0]);
  const hatFilter = new Tone.Filter(7000, "highpass").connect(fx.percussion[0]);
  const hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.008 },
    volume: -22,
  }).connect(hatFilter);
  const openHat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.02 },
    volume: -26,
  }).connect(hatFilter);
  let step = 0;

  const loop = new Tone.Loop((time) => {
    const bar = Math.floor(step / 16),
      s = step % 16;
    const unit = Tone.Time("16n").toSeconds();
    const length = 0.75 + (Phase.channels.lead.speed / 100) * 0.35;
    if (Phase.enabled.lead) {
      for (let voice = 0; voice < 2; voice++) {
        for (const event of phaseMelodyEvents(
          voice,
          bar,
          Phase.melodySelection[voice],
        )) {
          if (event.step !== s) continue;
          const synth = voice === 0 ? lead : answer;
          const velocity =
            event.velocity *
            (Phase.melodyVolume[voice] / 100) *
            (voice === 0 ? 0.65 : 0.6);
          synth.triggerAttackRelease(
            event.note,
            unit * event.length * length,
            time,
            velocity,
          );
        }
      }
    }
    if (Phase.enabled.bass && s % 2 === 0) {
      const root = PHASE_SONG.roots[bar % 4];
      const hz = Tone.Frequency(root).toFrequency();
      const octave = [6, 14].includes(s) ? 2 : 1;
      bass.triggerAttackRelease(
        hz * octave,
        unit * (0.7 + (Phase.channels.bass.speed / 100) * 0.3),
        time,
        s % 4 === 0 ? 0.58 : 0.43,
      );
    }
    if (Phase.enabled.drums) {
      if (s % 4 === 0)
        kick.triggerAttackRelease(
          "C1",
          unit * 0.8,
          time,
          s === 0 ? 0.78 : 0.65,
        );
      if (s === 4 || s === 12) {
        snare.triggerAttackRelease(unit * 0.4, time, 0.52);
        snareBody.triggerAttackRelease(185, unit * 0.3, time, 0.28);
      }
    }
    if (Phase.enabled.percussion && s % 2 === 0) {
      if (s === 14 && bar % 2 === 1)
        openHat.triggerAttackRelease(unit * 0.6, time, 0.35);
      else
        hat.triggerAttackRelease(unit * 0.13, time, s % 4 === 2 ? 0.45 : 0.24);
    }
    step = (step + 1) % 128;
  }, "16n").start(0);
  const base = { lead: -12, bass: -13, drums: -12, percussion: -12 };
  const api = {
    update(ch, param, v) {
      if (param === "vol")
        channels[ch].volume.rampTo(
          v === 0 ? -Infinity : base[ch] + 20 * Math.log10(v / 100),
          0.08,
        );
      if (param === "depth") {
        if (ch === "lead") {
          leadFilter.frequency.rampTo(1400 + v * 38, 0.08);
          answerFilter.frequency.rampTo(1000 + v * 24, 0.08);
        }
        if (ch === "bass") bassFilter.frequency.rampTo(350 + v * 12, 0.08);
        if (ch === "drums") snare.envelope.decay = 0.045 + v * 0.0009;
        if (ch === "percussion") hat.envelope.decay = 0.012 + v * 0.0003;
      }
      if (param === "speed" && ch === "drums")
        kick.envelope.decay = 0.1 + v * 0.001;
      if (param === "speed" && ch === "percussion")
        openHat.envelope.decay = 0.045 + v * 0.001;
    },
    effect(ch, i) {
      const wet = {
        lead: [0.13, 0.08],
        bass: [0.12, 0.12],
        drums: [0.1, 0.07],
        percussion: [0.08, 0.06],
      };
      fx[ch][i].wet.rampTo(Phase.effects[ch][i] ? wet[ch][i] : 0, 0.08);
    },
    mute(ch) {
      channels[ch].mute = !Phase.enabled[ch];
    },
    tempo() {
      Tone.Transport.bpm.rampTo(Phase.bpm, 0.2);
    },
    master() {
      if (Phase.playing) master.gain.rampTo((Phase.master / 100) * 0.8, 0.05);
    },
    start() {
      step = 0;
      Tone.Transport.position = 0;
      Tone.Transport.bpm.value = Phase.bpm;
      master.gain.rampTo((Phase.master / 100) * 0.8, 0.05);
      Tone.Transport.start("+0.1");
    },
    stop() {
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      step = 0;
      master.gain.rampTo(0, 0.03);
      lead.triggerRelease();
      answer.triggerRelease();
      bass.triggerRelease();
      snareBody.triggerRelease();
    },
  };
  for (const ch of Object.keys(channels)) {
    for (const p of ["vol", "speed", "depth"])
      api.update(ch, p, Phase.channels[ch][p]);
    for (let i = 0; i < 2; i++) api.effect(ch, i);
  }
  return api;
}
