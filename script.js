import { TORN_API_KEY } from "./config.js";

const URL = `https://api.torn.com/user/?selections=bars,cooldowns&key=${TORN_API_KEY}`;

const COOLDOWN_LINKS = {
  drug: "https://www.torn.com/item.php#drugs",
  medical: "https://www.torn.com/hospital.php",
  booster: "https://www.torn.com/item.php#boosters"
};

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

let cooldowns = {};
let apiInterval = null;

const API_INTERVAL = 30000; // 30s (seguro)

async function updateDashboard() {
  try {
    const res = await fetch(URL);
    const data = await res.json();

    console.log("API call", new Date().toLocaleTimeString());

    // salva cooldowns vindos da API
    cooldowns = { ...data.cooldowns };

    // render inicial
    renderCooldown("drug", cooldowns.drug);
    renderCooldown("medical", cooldowns.medical);
    renderCooldown("booster", cooldowns.booster);

  } catch (e) {
    console.error("Erro na API", e);
  }
}


    // Vida
    const lifePct = percent(data.life.current, data.life.maximum);
    document.getElementById("life-bar").style.width = `${lifePct}%`;
    document.getElementById("life-text").innerText =
      `${data.life.current} / ${data.life.maximum}`;

    // Nerve
    const nervePct = percent(data.nerve.current, data.nerve.maximum);
    document.getElementById("nerve-bar").style.width = `${nervePct}%`;
    document.getElementById("nerve-text").innerText =
      `${data.nerve.current} / ${data.nerve.maximum}`;

    // Cooldowns
renderCooldown("drug", data.cooldowns.drug);
renderCooldown("medical", data.cooldowns.medical);
renderCooldown("booster", data.cooldowns.booster);

  } catch (e) {
    console.error("Erro ao buscar dados do Torn:", e);
  }
}

function renderCooldown(id, seconds) {
  const el = document.getElementById(id);

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

updateDashboard(); // primeira chamada

apiInterval = setInterval(updateDashboard, API_INTERVAL);

function tickCooldowns() {
  for (const key in cooldowns) {
    if (cooldowns[key] > 0) {
      cooldowns[key]--;
      renderCooldown(key, cooldowns[key]);
    }
  }
}

setInterval(tickCooldowns, 1000);
