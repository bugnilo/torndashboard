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

function calculateEnergyRegen(current, max) {
  const missing = max - current;
  if (missing <= 0) return null;

  // Torn: +5 energy a cada 10 minutos
  const ticks = missing / 5;
  const totalMinutes = ticks * 10;

  const readyAt = new Date(Date.now() + totalMinutes * 60000);

  return {
    minutes: Math.round(totalMinutes),
    readyAt
  };
}

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

  timerEl.innerText = `⚡ cheia em ${regen.minutes} min`;
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

    // ENERGY REGEN
const energyRegen = calculateEnergyRegen(
  data.energy.current,
  data.energy.maximum
);

renderEnergyRegen(energyRegen);


    // Nerve
    const nervePct = percent(data.nerve.current, data.nerve.maximum);
    document.getElementById("nerve-bar").style.width = `${nervePct}%`;
    document.getElementById("nerve-text").innerText =
      `${data.nerve.current} / ${data.nerve.maximum}`;

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
updateDashboard(); // primeira chamada
setInterval(updateDashboard, API_INTERVAL);

setInterval(() => {
  for (const key in cooldowns) {
    if (cooldowns[key] > 0) {
      cooldowns[key]--;
      renderCooldown(key, cooldowns[key]);
    }
  }
}, 60000);
