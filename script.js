import { TORN_API_KEY } from "./config.js";

const URL = `https://api.torn.com/user/?selections=bars,cooldowns&key=${TORN_API_KEY}`;

const COOLDOWN_LINKS = {
  drug: "https://www.torn.com/item.php#drugs",
  medical: "https://www.torn.com/factions.php?step=your#/tab=armoury",
  booster: "https://www.torn.com/item.php#boosters",
  racing: "https://www.torn.com/racing.php"
};

const API_INTERVAL = 60000; // 60s

let cooldowns = {};
let racingEndAt = null; // mantido apenas para compatibilidade visual

// ================= UTIL =================
function formatTime(seconds) {
  if (seconds <= 0) return "Pronto";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h && `${h}h`, m && `${m}m`, s && `${s}s`]
    .filter(Boolean)
    .join(" ");
}

function percent(current, max) {
  return Math.round((current / max) * 100);
}

function formatMinutesToHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ================= STATE =================
let energyRegenState = null;
let nerveRegenState = null;

// ================= RENDER =================
function renderCooldown(id, seconds) {
  const el = document.getElementById(id);
  if (!el) return;

  if (seconds <= 0) {
    el.innerHTML = `
      <a href="${COOLDOWN_LINKS[id]}"
         target="_blank"
         class="cooldown-btn">
         Usar agora
      </a>
    `;
  } else {
    el.textContent = `⏳ ${formatTime(seconds)}`;
    el.className = "waiting";
  }
}

function renderRacing() {
  const el = document.getElementById("racing");
  if (!el) return;

  el.innerHTML = `
    <a href="${COOLDOWN_LINKS.racing}"
       target="_blank"
       class="cooldown-btn">
       Ir para corrida 🏁
    </a>
  `;
}

function renderEnergyRegen(regen) {
  const timerEl = document.getElementById("energy-timer");
  const clockEl = document.getElementById("energy-clock");
  if (!timerEl || !clockEl) return;

  if (!regen) {
    timerEl.innerText = "⚡ Energy cheia";
    clockEl.innerText = "";
    return;
  }

  timerEl.innerText = `⚡ cheia em ${regen.label}`;
  clockEl.innerText =
    `🕒 às ${regen.readyAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

function renderNerveRegen(regen) {
  const timerEl = document.getElementById("nerve-timer");
  const clockEl = document.getElementById("nerve-clock");
  if (!timerEl || !clockEl) return;

  if (!regen) {
    timerEl.innerText = "🧠 Nerve cheia";
    clockEl.innerText = "";
    return;
  }

  timerEl.innerText = `🧠 cheia em ${regen.label}`;
  clockEl.innerText =
    `🕒 às ${regen.readyAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

// ================= API =================
async function updateDashboard() {
  try {
    const res = await fetch(URL);
    const data = await res.json();

    console.log("API call", new Date().toLocaleTimeString());

    // ========= ENERGY =========
    const energy = data.bars?.energy;
    if (energy) {
      const energyPct = percent(energy.current, energy.maximum);
      document.getElementById("energy-bar").style.width = `${energyPct}%`;
      document.getElementById("energy-text").innerText =
        `${energy.current} / ${energy.maximum}`;

      const energyMissing = energy.maximum - energy.current;
      energyRegenState =
        energyMissing > 0
          ? { readyAt: Date.now() + ((energyMissing / 5) * 10) * 60000 }
          : null;
    }

    // ========= NERVE =========
    const nerve = data.bars?.nerve;
    if (nerve) {
      const nervePct = percent(nerve.current, nerve.maximum);
      document.getElementById("nerve-bar").style.width = `${nervePct}%`;
      document.getElementById("nerve-text").innerText =
        `${nerve.current} / ${nerve.maximum}`;

      const nerveMissing = nerve.maximum - nerve.current;
      nerveRegenState =
        nerveMissing > 0
          ? { readyAt: Date.now() + (nerveMissing * 5) * 60000 }
          : null;
    }

    // ========= COOLDOWNS =========
    if (data.cooldowns) {
      cooldowns = { ...data.cooldowns };
    }

    renderCooldown("drug", cooldowns.drug ?? 0);
    renderCooldown("medical", cooldowns.medical ?? 0);
    renderCooldown("booster", cooldowns.booster ?? 0);

    // ========= RACING =========
    renderRacing();

  } catch (e) {
    console.error("Erro ao buscar dados do Torn:", e);
  }
}

// ================= TIMERS =================
updateDashboard();
setInterval(updateDashboard, API_INTERVAL);

// Cooldowns
setInterval(() => {
  if (cooldowns.drug > 0) {
    cooldowns.drug--;
    renderCooldown("drug", cooldowns.drug);
  }

  if (cooldowns.medical > 0) {
    cooldowns.medical--;
    renderCooldown("medical", cooldowns.medical);
  }

  if (cooldowns.booster > 0) {
    cooldowns.booster--;
    renderCooldown("booster", cooldowns.booster);
  }
}, 1000);

// Energy + Nerve regen
setInterval(() => {
  const now = Date.now();

  if (energyRegenState) {
    const diff = energyRegenState.readyAt - now;
    renderEnergyRegen(
      diff <= 0
        ? null
        : {
            label: formatMinutesToHM(Math.ceil(diff / 60000)),
            readyAt: new Date(energyRegenState.readyAt)
          }
    );
  }

  if (nerveRegenState) {
    const diff = nerveRegenState.readyAt - now;
    renderNerveRegen(
      diff <= 0
        ? null
        : {
            label: formatMinutesToHM(Math.ceil(diff / 60000)),
            readyAt: new Date(nerveRegenState.readyAt)
          }
    );
  }

  renderRacing();
}, 1000);
