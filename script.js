import { TORN_API_KEY } from "./config.js";

const URL = `https://api.torn.com/user/?selections=bars,cooldowns&key=${TORN_API_KEY}`;

const COOLDOWN_LINKS = {
  drug: "https://www.torn.com/item.php#drugs",
  medical: "https://www.torn.com/hospital.php",
  booster: "https://www.torn.com/item.php#boosters"
};

const API_INTERVAL = 60000; // 60s

let cooldowns = {};

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

// === ADICIONADO: formatação legível (1h 9m)
function formatMinutesToHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ================= STATE (ADICIONADO) =================
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

    // Energia
    const energyPct = percent(data.energy.current, data.energy.maximum);
    document.getElementById("life-bar").style.width = `${energyPct}%`;
    document.getElementById("life-text").innerText =
      `${data.energy.current} / ${data.energy.maximum}`;

    // === ALTERADO: fixa previsão de ENERGY (uma vez)
    const energyMissing = data.energy.maximum - data.energy.current;
    if (energyMissing > 0) {
      const totalMinutes = (energyMissing / 5) * 10;
      energyRegenState = {
        readyAt: Date.now() + totalMinutes * 60000
      };
    } else {
      energyRegenState = null;
    }

    // Nerve
    const nervePct = percent(data.nerve.current, data.nerve.maximum);
    document.getElementById("nerve-bar").style.width = `${nervePct}%`;
    document.getElementById("nerve-text").innerText =
      `${data.nerve.current} / ${data.nerve.maximum}`;

    // === ALTERADO: fixa previsão de NERVE (uma vez)
    const nerveMissing = data.nerve.maximum - data.nerve.current;
    if (nerveMissing > 0) {
      const totalMinutes = nerveMissing * 5;
      nerveRegenState = {
        readyAt: Date.now() + totalMinutes * 60000
      };
    } else {
      nerveRegenState = null;
    }

    // Cooldowns
    cooldowns = { ...data.cooldowns };
    renderCooldown("drug", cooldowns.drug);
    renderCooldown("medical", cooldowns.medical);
    renderCooldown("booster", cooldowns.booster);

  } catch (e) {
    console.error("Erro ao buscar dados do Torn:", e);
  }
}

// ================= TIMERS =================
updateDashboard();
setInterval(updateDashboard, API_INTERVAL);

// cooldowns (como você já tinha)
setInterval(() => {
  for (const key in cooldowns) {
    if (cooldowns[key] > 0) {
      cooldowns[key]--;
      renderCooldown(key, cooldowns[key]);
    }
  }
}, 60000);

// === ADICIONADO: countdown regressivo de Energy + Nerve
setInterval(() => {
  const now = Date.now();

  if (energyRegenState) {
    const diff = energyRegenState.readyAt - now;
    if (diff <= 0) {
      energyRegenState = null;
      renderEnergyRegen(null);
    } else {
      const minutes = Math.ceil(diff / 60000);
      renderEnergyRegen({
        label: formatMinutesToHM(minutes),
        readyAt: new Date(energyRegenState.readyAt)
      });
    }
  }

  if (nerveRegenState) {
    const diff = nerveRegenState.readyAt - now;
    if (diff <= 0) {
      nerveRegenState = null;
      renderNerveRegen(null);
    } else {
      const minutes = Math.ceil(diff / 60000);
      renderNerveRegen({
        label: formatMinutesToHM(minutes),
        readyAt: new Date(nerveRegenState.readyAt)
      });
    }
  }
}, 1000);

