// Surprise Lili — anniversary quiz. Vanilla JS, no build step, no runtime dependency.

// Tunables (used to be Design-tool props)
const CONFETTIS = true;
const TAQUINERIE = "standard"; // "douce" | "standard" | "piquante"
const RYTHME = 1; // speed multiplier for timed reveals

const CITIES = [
  { n: "Venise", x: 202, y: 166 },
  { n: "Florence", x: 194, y: 182 },
  { n: "Naples", x: 219, y: 212 },
  { n: "Milan", x: 177, y: 165 },
  { n: "Rome", x: 204, y: 201 },
];

const TAUNTS = {
  douce: [
    "Pas tout à fait. Réessaie.",
    "Tu y es presque.",
    "Encore un essai, tu brûles.",
    "Indice : ce n’est pas Florence.",
  ],
  standard: [
    "Non. Mais tu chauffes.",
    "Presque. Enfin non, pas du tout.",
    "Réessaie, j’ai toute la soirée.",
    "Indice : ce n’est pas Florence.",
  ],
  piquante: [
    "Non. Et tu as fait des études.",
    "Presque. Enfin non, pas du tout.",
    "Réessaie. J’ai toute la soirée, moi.",
    "Indice : ce n’est pas Florence. Ça réduit le champ.",
  ],
};

const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const QUESTIONS = {
  1: {
    kicker: "Question 1 / 5",
    prompt: "On s’est rencontrés où, exactement ?",
    type: "mcq",
    options: ["En soirée", "Au lycée", "Sur une appli", "Au sport"],
    answer: "Au lycée",
    successMsg: "Facile. On passe aux choses sérieuses.",
    nextLabel: "Les choses sérieuses",
    wrongMsgs: [
      "Non. Tu confonds avec quelqu’un d’autre ?",
      "Toujours pas. Concentre-toi.",
      "Non. Et c’était ta propre vie.",
    ],
  },
  2: {
    kicker: "Question 2 / 5",
    prompt: "Notre lieu de RDV après les cours, c’était où ?",
    type: "text",
    placeholder: "Écris ta réponse…",
    nextLabel: "Avoue-moi ça",
    check: (v) =>
      !!v &&
      (v.indexOf("muret") >= 0 ||
        v.indexOf("mur") >= 0 ||
        v.indexOf("tram") >= 0),
    successMsg:
      "Le muret près du tram. Évidemment.\n…Bon. Maintenant passons auc choses sérieuses.",
    wrongMsgs: [
      "Non. Cherche un endroit inconfortable où on restait quand même des heures.",
      "Toujours pas. Il y avait du béton et des rails.",
      "Non. Et pourtant tu y as passé des mois.",
    ],
  },
  3: {
    kicker: "Question 3 / 5",
    prompt: "Quelle mer ?",
    intro: "Un pays, pas le nôtre… Direction : le sud.",
    isBascule: true,
    type: "mcq",
    options: [
      "La Baltique",
      "La Méditerranée",
      "La mer du Nord",
      "L’Atlantique",
    ],
    answer: "La Méditerranée",
    successMsg: "La Méditerranée. On se rapproche.",
    nextLabel: "On resserre",
    wrongMsgs: [
      "Non. Trop froid, vraiment trop froid.",
      "Non. On va vers le soleil, je te rappelle.",
      "Non. Relis l’indice.",
    ],
  },
  4: {
    kicker: "Question 4 / 5",
    prompt: "Quel pays ?",
    intro:
      "On y mange avec les mains ce qui se mange à la fourchette ailleurs.",
    type: "mcq",
    options: ["Albanie", "Égypte", "Italie", "Croatie"],
    answer: "Italie",
    successMsg: "L’Italie. Il reste cinq villes en jeu.",
    nextLabel: "Et la ville ?",
    wrongMsgs: [
      "Non. Réessaie.",
      "Non. L’indice est plus simple que ça.",
      "Non. Tu cherches trop loin.",
    ],
  },
  5: {
    kicker: "Question 5 / 5",
    prompt: "Alors, c’est où ?",
    intro:
      "On y jette une pièce dans l’eau pour être sûr d’y revenir. Il paraît que ça marche. On vérifiera.",
    type: "text",
    placeholder: "La ville…",
    nextLabel: "Ouvre",
    check: (v) =>
      v === "rome" ||
      v === "roma" ||
      v.indexOf("rome") >= 0 ||
      v.indexOf("roma") >= 0,
    successMsg: "Voilà.",
    get wrongMsgs() {
      return TAUNTS[TAQUINERIE] || TAUNTS.standard;
    },
  },
};

const HALOS = {
  3: "transform:translate(172px,120px) scale(1.75)",
  4: "transform:translate(196px,254px) scale(1)",
  5: "transform:translate(206px,196px) scale(.4)",
  6: "transform:translate(204px,201px) scale(.16)",
};
const DIST = {
  3: "≈ 1 400 km d’ici",
  4: "≈ 1 100 km d’ici",
  5: "≈ 1 100 km d’ici",
};

const state = {
  screen: 0,
  phase: "in",
  msg: null,
  ok: false,
  wrong: 0,
  txt: "",
  picked: [],
  panel: false,
  lit: {},
  boom: false,
};

const timers = [];
const after = (ms, fn) => timers.push(setTimeout(fn, ms * RYTHME));
const clearTimers = () => {
  timers.splice(0).forEach(clearTimeout);
};

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const dotsEl = document.getElementById("dots");
const mapWrapEl = document.getElementById("mapWrap");
const stageEl = document.getElementById("stage");
const confettiEl = document.getElementById("confettiLayer");

function goto(n) {
  clearTimers();
  state.phase = "out";
  render();
  setTimeout(() => {
    state.screen = n;
    state.phase = "in";
    state.msg = null;
    state.ok = false;
    state.wrong = 0;
    state.txt = "";
    state.picked = [];
    if (n === 5) runScreen5();
    if (n === 6) {
      state.panel = false;
      fire();
    }
    render();
  }, 380);
}

function runScreen5() {
  const lit = {};
  CITIES.forEach((c) => (lit[c.n] = true));
  state.panel = true;
  state.lit = lit;
  after(1700, () => {
    state.lit.Venise = false;
    renderMap();
  });
  after(3200, () => {
    state.lit.Naples = false;
    renderMap();
  });
  after(4700, () => {
    state.lit.Milan = false;
    renderMap();
  });
}

function revealPanel() {
  state.panel = true;
  CITIES.forEach((c, i) =>
    after(260 + i * 180, () => {
      state.lit[c.n] = true;
      renderMap();
    }),
  );
}

function fire() {
  if (!CONFETTIS) return;
  state.boom = true;
  renderConfetti();
}

function pick(label) {
  if (state.ok) return;
  const q = QUESTIONS[state.screen];
  if (label === q.answer) {
    state.ok = true;
    state.msg = q.successMsg;
    state.picked = [];
    if (state.screen === 4) revealPanel();
  } else {
    state.wrong++;
    state.msg = q.wrongMsgs[state.wrong % q.wrongMsgs.length];
    if (state.picked.indexOf(label) < 0) state.picked.push(label);
  }
  render();
}

function submit() {
  if (state.ok) return;
  const q = QUESTIONS[state.screen];
  const inputEl = document.getElementById("answerInput");
  const raw = inputEl ? inputEl.value : "";
  const v = norm(raw);
  if (q.check(v)) {
    state.ok = true;
    state.msg = q.successMsg;
    state.txt = raw;
    render();
    if (state.screen === 5) after(700, () => goto(6));
  } else {
    state.wrong++;
    state.msg = q.wrongMsgs[state.wrong % q.wrongMsgs.length];
    state.txt = state.screen === 5 ? "" : raw;
    render();
  }
}

function onKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!state.ok) submit();
  }
}

function renderConfetti() {
  if (!state.boom) {
    confettiEl.innerHTML = "";
    return;
  }
  const cols = [
    "#C25B3A",
    "#D99A4E",
    "#F2E4D0",
    "#D99A4E",
    "#8C3B2E",
    "#8C3B2E",
    "#D99A4E",
  ];
  let html = "";
  for (let i = 0; i < 80; i++) {
    const w = 6 + Math.round(Math.random() * 6);
    const h = (w * (Math.random() > 0.5 ? 1 : 2.2)).toFixed(0);
    html += `<span style="position:absolute;top:0;left:${(Math.random() * 100).toFixed(2)}%;width:${w}px;height:${h}px;background:${cols[i % cols.length]};border-radius:${Math.random() > 0.6 ? "50%" : "1px"};opacity:0;--dx:${(Math.random() * 180 - 90).toFixed(0)}px;--rot:${(360 + Math.random() * 900).toFixed(0)}deg;animation:lili-conf ${(2.6 + Math.random() * 2.4).toFixed(2)}s ${(Math.random() * 1.6).toFixed(2)}s cubic-bezier(.35,.4,.55,1) forwards"></span>`;
  }
  confettiEl.innerHTML = html;
}

function renderDots() {
  const sc = state.screen;
  dotsEl.style.display = sc === 6 ? "none" : "";
  dotsEl.innerHTML = [1, 2, 3, 4, 5]
    .map((i) => {
      const width = sc === i ? "22px" : "6px";
      const bg =
        sc > i || sc === 6
          ? "rgba(217,154,78,.8)"
          : sc === i
            ? "#C25B3A"
            : "rgba(242,228,208,.18)";
      return `<span class="lili-dot" style="width:${width};background:${bg}"></span>`;
    })
    .join("");
}

const MAP_STATIC_SVG = `
  <defs>
    <radialGradient id="liliHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#D99A4E" stop-opacity=".55"></stop>
      <stop offset="45%" stop-color="#C25B3A" stop-opacity=".30"></stop>
      <stop offset="100%" stop-color="#C25B3A" stop-opacity="0"></stop>
    </radialGradient>
  </defs>
  <g stroke="rgba(242,228,208,.07)" stroke-width="1">
    <path d="M0 80H400M0 160H400M0 240H400M80 0V320M160 0V320M240 0V320M320 0V320"></path>
  </g>
  <g fill="rgba(242,228,208,.13)" stroke="rgba(242,228,208,.28)" stroke-width="1" stroke-linejoin="round">
    <path d="M25 190 L33 250 L50 260 L92 250 L100 230 L125 200 L133 185 L158 185 L183 180 L196 190 L202 208 L217 214 L230 240 L254 219 L217 200 L204 178 L202 166 L215 165 L225 180 L250 194 L258 215 L275 235 L292 250 L300 215 L321 215 L333 190 L337 170 L350 160 L400 155 L400 0 L300 0 L295 55 L258 75 L229 77 L200 68 L187 65 L175 75 L133 95 L100 125 L62 135 L92 165 Z"></path>
    <path d="M135 45 L150 5 L190 0 L262 0 L262 30 L228 52 L180 48 Z"></path>
    <path d="M88 118 L72 96 L70 60 L84 44 L98 62 L96 96 Z"></path>
    <path d="M30 82 L48 84 L46 102 L28 100 Z"></path>
    <path d="M16 270 L100 260 L167 250 L192 285 L267 300 L308 305 L367 306 L400 306 L400 320 L0 320 L0 276 Z"></path>
    <path d="M210 243 L224 240 L222 252 L208 252 Z"></path>
    <path d="M170 210 L180 212 L180 232 L170 230 Z"></path>
    <path d="M172 196 L180 198 L179 208 L171 206 Z"></path>
    <path d="M300 268 L318 266 L318 272 L300 274 Z"></path>
  </g>`;

function renderMap() {
  const sc = state.screen;
  if (!(sc >= 3 && sc <= 5)) {
    mapWrapEl.innerHTML = "";
    return;
  }
  const haloStyle = HALOS[sc] || HALOS[3];
  const distance = DIST[sc] || DIST[3];
  const cityDots = CITIES.map(
    (c) =>
      `<circle class="lili-city-dot" cx="${c.x}" cy="${c.y}" r="3.4" fill="#F2E4D0" stroke="#C25B3A" stroke-width="1.2" opacity="${state.panel && state.lit[c.n] ? 1 : 0}"></circle>`,
  ).join("");
  const panelHtml = !state.panel
    ? ""
    : `
    <div class="lili-panel">
      <div class="lili-panel-title">Destinations encore possibles</div>
      <div class="lili-cities">
        ${CITIES.map((c) => {
          const on = !!state.lit[c.n];
          const rowStyle = on
            ? "color:#F2E4D0;opacity:1;border-color:rgba(217,154,78,.45)"
            : "color:rgba(242,228,208,.32);opacity:.5;text-decoration:line-through";
          const bulletStyle = on
            ? "background:#D99A4E;box-shadow:0 0 0 4px rgba(217,154,78,.18)"
            : "background:rgba(242,228,208,.22);box-shadow:none";
          return `<div class="lili-city-chip" style="${rowStyle}"><span class="lili-city-bullet" style="${bulletStyle}"></span><span>${c.n}</span></div>`;
        }).join("")}
      </div>
    </div>`;
  mapWrapEl.innerHTML = `
    <div class="lili-map">
      <div class="lili-map-card">
        <svg class="lili-map-svg" viewBox="0 0 400 320" aria-hidden="true">
          ${MAP_STATIC_SVG}
          <g class="lili-halo" style="${haloStyle}"><circle cx="0" cy="0" r="100" fill="url(#liliHalo)"></circle></g>
          ${cityDots}
        </svg>
        <div class="lili-pill">${distance}</div>
      </div>
      ${panelHtml}
    </div>`;
}

function renderS0() {
  return `
    <div class="lili-intro-screen">
      <div class="lili-kicker">25 ans</div>
      <h1 class="lili-h1">Joyeux anniversaire <em>Lili</em></h1>
      <div class="lili-flourish"><svg viewBox="0 0 120 14" style="width:120px;height:14px;opacity:.85" fill="none" stroke="#C25B3A" stroke-width="1.2" stroke-linecap="round"><path d="M4 7q14-8 26 0t26 0"></path><path d="M64 7q14-8 26 0t26 0"></path><circle cx="60" cy="7" r="2.6" fill="#D99A4E" stroke="none"></circle></svg></div>
      <p class="lili-sub">25 ans, ça se mérite.</p>
      <p class="lili-lead">Cinq questions. Une récompense. Bonne chance.</p>
      <button type="button" id="startBtn" class="lili-btn btn-primary">Je commence</button>
    </div>`;
}

function renderOptions(q) {
  return q.options
    .map((label) => {
      let style = "";
      if (state.ok && label === q.answer)
        style +=
          "border-color:#D99A4E;background:rgba(217,154,78,.20);color:#F2E4D0;";
      if (state.picked.indexOf(label) >= 0)
        style +=
          "opacity:.4;border-color:rgba(194,91,58,.45);text-decoration:line-through;";
      if (state.ok && label !== q.answer) style += "opacity:.35;";
      return `<button type="button" class="lili-option" data-pick="${escapeHtml(label)}" style="${style}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function renderQuestion(sc) {
  const q = QUESTIONS[sc];
  let html = `<div class="lili-question">`;
  html += `<div class="lili-kicker-gold">${q.kicker}</div>`;
  if (q.isBascule)
    html += `<p class="lili-bascule">Il y a une destination au bout de ce jeu. Tu pars quelque part. Reste à savoir où.</p>`;
  html += `<h2 class="lili-h2">${escapeHtml(q.prompt)}</h2>`;
  if (q.intro) html += `<p class="lili-para">${escapeHtml(q.intro)}</p>`;

  if (q.type === "mcq") {
    if (!state.ok)
      html += `<div class="lili-options">${renderOptions(q)}</div>`;
    else
      html += `<div class="lili-chip"><span class="lili-chip-mark">✓</span>${escapeHtml(q.answer)}</div>`;
  } else {
    html += `
      <div class="lili-answer-row">
        <input id="answerInput" class="lili-input" type="text" value="${escapeHtml(state.txt)}" placeholder="${escapeHtml(q.placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button type="button" id="submitBtn" class="lili-btn btn-primary">Valider</button>
      </div>`;
  }

  if (state.msg)
    html += `<p class="lili-msg${state.ok ? " is-ok" : ""}">${escapeHtml(state.msg)}</p>`;
  if (state.ok)
    html += `<button type="button" id="nextBtn" class="lili-btn btn-ghost">${escapeHtml(q.nextLabel)}</button>`;
  html += `</div>`;
  return html;
}

const LANDMARK_DEFS = `
  <g id="lm-colisee"><path d="M8 84V44C8 22 26 10 50 10s42 12 42 34v40"></path><path d="M4 84H96M10 44H90M10 62H90"></path><path d="M16 60v-8a5 5 0 0 1 10 0v8M34 60v-8a5 5 0 0 1 10 0v8M52 60v-8a5 5 0 0 1 10 0v8M70 60v-8a5 5 0 0 1 10 0v8"></path><path d="M16 78v-8a5 5 0 0 1 10 0v8M34 78v-8a5 5 0 0 1 10 0v8M52 78v-8a5 5 0 0 1 10 0v8M70 78v-8a5 5 0 0 1 10 0v8"></path></g>
  <g id="lm-dome"><path d="M50 8V2M47 5h6"></path><path d="M45 22v-8h10v8"></path><path d="M26 52a24 26 0 0 1 48 0"></path><path d="M38 52a12 26 0 0 1 24 0"></path><path d="M24 52h52M28 52v14M72 52v14M24 66h52"></path><path d="M18 86h64M26 66v20M74 66v20M46 86V72h8v14"></path></g>
  <g id="lm-colonne"><circle cx="50" cy="12" r="5"></circle><path d="M36 22h28M40 28h20"></path><path d="M41 84V28M59 84V28"></path><path d="M41 40q9 5 18 0M41 54q9 5 18 0M41 68q9 5 18 0"></path><path d="M34 84h32M28 92h44"></path></g>
  <g id="lm-arc"><path d="M12 86V30h76v56"></path><path d="M6 86h88M8 42h84M8 26h84"></path><path d="M37 86V58a13 13 0 0 1 26 0v28"></path><path d="M19 86V70a5 5 0 0 1 10 0v16M71 86V70a5 5 0 0 1 10 0v16"></path><path d="M33 26v-8M50 26v-10M67 26v-8"></path></g>
  <g id="lm-fontaine"><path d="M30 68V42a20 20 0 0 1 40 0v26"></path><path d="M20 68V46M80 68V46M16 46h68"></path><path d="M42 68v10M50 68v12M58 68v10"></path><path d="M8 78q42 20 84 0"></path><path d="M4 74h92"></path><path d="M44 40a6 6 0 0 1 12 0v12h-12z"></path></g>
  <g id="lm-pantheon"><path d="M30 34a20 20 0 0 1 40 0"></path><path d="M14 54 50 30l36 24"></path><path d="M16 54h68"></path><path d="M24 58v26M38 58v26M50 58v26M62 58v26M76 58v26"></path><path d="M18 84h64M12 90h76"></path></g>`;

function renderS6() {
  const lm = (cls, id) =>
    `<svg class="lili-lm ${cls}" viewBox="0 0 100 100" fill="none" stroke="#D99A4E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><use href="#${id}"></use></svg>`;
  return `
    <div class="lili-reveal-decor">
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${LANDMARK_DEFS}</defs></svg>
      ${lm("lili-lm-colisee-1", "lm-colisee")}
      ${lm("lili-lm-dome-1", "lm-dome")}
      ${lm("lili-lm-colonne-1", "lm-colonne")}
      ${lm("lili-lm-pantheon-1", "lm-pantheon")}
      ${lm("lili-lm-arc-1", "lm-arc")}
      ${lm("lili-lm-fontaine-1", "lm-fontaine")}
      ${lm("lili-lm-colonne-2", "lm-colonne")}
      ${lm("lili-lm-colisee-2", "lm-colisee")}
    </div>
    <div class="lili-reveal">
      <div class="lili-reveal-kicker">Destination confirmée</div>
      <div class="lili-word">ROME</div>
      <svg class="lili-reveal-divider" viewBox="0 0 140 16" fill="none" stroke="#D99A4E" stroke-width="1.2" stroke-linecap="round"><path d="M6 8q16-9 30 0t30 0"></path><path d="M74 8q16-9 30 0t30 0"></path><path d="M70 4.6c1.6-2.4 5-1.4 5 1.2 0 2.2-3 4-5 5.6-2-1.6-5-3.4-5-5.6 0-2.6 3.4-3.6 5-1.2z" fill="#C25B3A" stroke="none"></path></svg>
      <div class="lili-date">du 10 au 14 mars 2027</div>
      <p class="lili-final">Joyeux anniversaire Lili.</p>
    </div>`;
}

function bindStage() {
  const sc = state.screen;
  if (sc === 0) {
    document
      .getElementById("startBtn")
      .addEventListener("click", () => goto(1));
  } else if (sc >= 1 && sc <= 5) {
    stageEl.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => pick(btn.getAttribute("data-pick")));
    });
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.addEventListener("click", submit);
    const input = document.getElementById("answerInput");
    if (input) {
      input.addEventListener("keydown", onKey);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.addEventListener("click", () => goto(sc + 1));
  }
}

function renderStage() {
  const sc = state.screen;
  const fadeStyle = `transition:opacity .36s ease,transform .36s cubic-bezier(.22,1,.36,1);opacity:${state.phase === "out" ? 0 : 1};transform:${state.phase === "out" ? "translateY(-10px) scale(.985)" : "none"}`;
  let inner = "";
  if (sc === 0) inner = renderS0();
  else if (sc >= 1 && sc <= 5) inner = renderQuestion(sc);
  else if (sc === 6) inner = renderS6();
  stageEl.innerHTML = `<div style="${fadeStyle}">${inner}</div>`;
  bindStage();
}

function render() {
  renderDots();
  renderMap();
  renderStage();
}

render();
