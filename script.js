"use strict";
const Phase = {
  channels: {
    lead: { vol: 75, speed: 50, depth: 55 },
    bass: { vol: 75, speed: 50, depth: 50 },
    drums: { vol: 75, speed: 50, depth: 60 },
    percussion: { vol: 60, speed: 50, depth: 50 },
  },
  enabled: { lead: false, bass: false, drums: false, percussion: false },
  melodySelection: [0, 0],
  melodyVolume: [75, 62],
  effects: {},
  engine: null,
  playing: false,
  busy: false,
  bpm: 116,
  master: 75,
};
const status = (message) =>
  (document.getElementById("status").textContent = message);
async function prepare() {
  if (typeof Tone === "undefined")
    throw Error(
      "Не удалось загрузить Tone.js. Проверь подключение к интернету.",
    );
  await Tone.start();
  if (!Phase.engine) Phase.engine = createPhaseEngine();
}
let playbackRequest = 0;
async function play() {
  if (Phase.busy || Phase.playing) return;
  Phase.busy = true;
  const request = ++playbackRequest;
  try {
    await prepare();
    if (request !== playbackRequest) return;
    Phase.engine.start();
    Phase.playing = true;
    document.getElementById("play").classList.add("playing");
    status("PLAYING");
  } catch (error) {
    status(error.message);
    console.error(error);
    alert(error.message);
  } finally {
    Phase.busy = false;
  }
}
function stop() {
  playbackRequest++;
  Phase.engine?.stop();
  Phase.playing = false;
  document.getElementById("play").classList.remove("playing");
  status("STOPPED");
}
for (const container of document.querySelectorAll(".knobs")) {
  const channel = container.dataset.channel;
  for (const param of ["vol", "speed", "depth"]) {
    const wrap = document.createElement("div");
    wrap.className = "knob-control";
    wrap.innerHTML = `<button type="button" class="knob" role="slider" aria-label="${channel} ${param === "speed" ? "length" : param}" aria-valuemin="0" aria-valuemax="100"></button><label>${param === "speed" ? "length" : param}</label><output></output>`;
    container.append(wrap);
    const knob = wrap.querySelector("button");
    const change = (value) => {
      const v = Math.max(0, Math.min(100, Math.round(value)));
      Phase.channels[channel][param] = v;
      knob.style.setProperty("--angle", `${(v - 50) * 2.7}deg`);
      knob.setAttribute("aria-valuenow", v);
      const label = `${v}%`;
      knob.setAttribute("aria-valuetext", label);
      knob.title = `${param === "speed" ? "length" : param}: ${label}`;
      wrap.querySelector("output").textContent = label;
      Phase.engine?.update(channel, param, v);
    };
    change(Phase.channels[channel][param]);
    knob.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      knob.setPointerCapture(e.pointerId);
      const y = e.clientY,
        v = Phase.channels[channel][param];
      const move = (ev) => change(v + (y - ev.clientY) * 0.65);
      const up = () => {
        knob.removeEventListener("pointermove", move);
        knob.removeEventListener("pointerup", up);
        knob.removeEventListener("pointercancel", up);
      };
      knob.addEventListener("pointermove", move);
      knob.addEventListener("pointerup", up);
      knob.addEventListener("pointercancel", up);
    });
    knob.addEventListener("keydown", (e) => {
      if (
        ![
          "ArrowUp",
          "ArrowRight",
          "ArrowDown",
          "ArrowLeft",
          "Home",
          "End",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      change(
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? 100
            : Phase.channels[channel][param] +
              (["ArrowUp", "ArrowRight"].includes(e.key) ? 2 : -2),
      );
    });
    knob.addEventListener("dblclick", () =>
      change(param === "speed" ? 50 : param === "vol" ? 75 : 50),
    );
  }
}
for (const button of document.querySelectorAll(".channel-toggle"))
  button.addEventListener("click", async () => {
    const ch = button.dataset.toggle;
    Phase.enabled[ch] = !Phase.enabled[ch];
    button.classList.toggle("active", Phase.enabled[ch]);
    button.setAttribute("aria-pressed", Phase.enabled[ch]);
    Phase.engine?.mute(ch);
    if (Phase.enabled[ch]) await play();
  });
for (const group of document.querySelectorAll(".steps")) {
  const m = Number(group.dataset.melody);
  for (let i = 0; i < 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "step";
    b.classList.toggle("active", i === 0);
    b.setAttribute(
      "aria-label",
      `Melody ${m + 1}: вариант ${i + 1}, работает с Lead`,
    );
    b.setAttribute("aria-pressed", i === 0);
    b.title = `Вариант ${i + 1}`;
    b.addEventListener("click", async () => {
      const selection = Phase.melodySelection[m] === i ? null : i;
      Phase.melodySelection[m] = selection;
      group.querySelectorAll("button").forEach((el, j) => {
        el.classList.toggle("active", selection === j);
        el.setAttribute("aria-pressed", selection === j);
      });
      if (selection !== null) {
        Phase.enabled.lead = true;
        const toggle = document.querySelector("[data-toggle=lead]");
        toggle.classList.add("active");
        toggle.setAttribute("aria-pressed", "true");
        Phase.engine?.mute("lead");
        await play();
      }
    });
    group.append(b);
  }
}
for (let i = 0; i < 2; i++)
  document
    .getElementById(`melody${i + 1}vol`)
    .addEventListener(
      "input",
      (e) => (Phase.melodyVolume[i] = Number(e.target.value)),
    );
for (const card of document.querySelectorAll(".instrument")) {
  const ch = card.querySelector(".channel-toggle").dataset.toggle;
  Phase.effects[ch] = [false, false];
  const row = document.createElement("div");
  row.className = "fx";
  const labels = {
    lead: ["DELAY", "REVERB"],
    bass: ["DRIVE", "CHORUS"],
    drums: ["DRIVE", "ROOM"],
    percussion: ["DELAY", "REVERB"],
  }[ch];
  labels.forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      Phase.effects[ch][i] = !Phase.effects[ch][i];
      b.classList.toggle("active", Phase.effects[ch][i]);
      b.setAttribute("aria-pressed", Phase.effects[ch][i]);
      Phase.engine?.effect(ch, i);
    });
    row.append(b);
  });
  card.insertBefore(row, card.querySelector(".channel-toggle"));
}
document.getElementById("play").addEventListener("click", play);
document.getElementById("stop").addEventListener("click", stop);
document.getElementById("bpm").addEventListener("input", (e) => {
  Phase.bpm = Number(e.target.value);
  document.getElementById("bpmValue").textContent = Phase.bpm;
  Phase.engine?.tempo();
});
document.getElementById("master").addEventListener("input", (e) => {
  Phase.master = Number(e.target.value);
  Phase.engine?.master();
});
