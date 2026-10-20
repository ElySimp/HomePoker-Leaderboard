// Shared data loading, statistics and UI helpers for the leaderboard website.

const DATA_URL = "data/poker_data.json";
const AVATAR_COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#bf5af2", "#ff453a", "#64d2ff", "#ff375f", "#5e5ce6"];

async function loadSessions() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();
  return (json.sessions || [])
    .map((s) => ({ ...s, category: s.category || "Texas Hold'em" }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.timestamp || "").localeCompare(b.timestamp || ""));
}

function getCategories(sessions) {
  return [...new Set(sessions.map((s) => s.category))];
}

function filterSessions(sessions, category) {
  return category === "all" ? sessions : sessions.filter((s) => s.category === category);
}

// Build per-player statistics from a list of sessions.
function buildPlayerStats(sessions) {
  const map = {};
  sessions.forEach((s) => {
    s.players.forEach((p) => {
      if (!map[p.name]) {
        map[p.name] = {
          name: p.name, net: 0, sessions: 0, wins: 0, draws: 0, losses: 0, busts: 0,
          best: null, worst: null, history: [], streak: 0, bestStreak: 0,
          comebacks: 0,
        };
      }
      const st = map[p.name];
      st.net += p.net;
      st.sessions += 1;
      st.busts += p.bust_count || 0;
      if (p.status === "win") st.wins += 1;
      else if (p.status === "draw") st.draws += 1;
      else st.losses += 1;

      if (p.status === "win") {
        st.streak += 1;
        st.bestStreak = Math.max(st.bestStreak, st.streak);
      } else {
        st.streak = 0;
      }
      if (p.status === "win" && (p.bust_count || 0) >= 1) st.comebacks += 1;

      if (!st.best || p.net > st.best.net) st.best = { net: p.net, date: s.date };
      if (!st.worst || p.net < st.worst.net) st.worst = { net: p.net, date: s.date };

      st.history.push({
        date: s.date, category: s.category, session_id: s.session_id,
        buy_in: p.buy_in, bust_count: p.bust_count || 0, final_chips: p.final_chips,
        net: p.net, status: p.status, cumulative: st.net,
      });
    });
  });
  return Object.values(map).map((st) => ({
    ...st,
    winRate: st.sessions ? Math.round((st.wins / st.sessions) * 100) : 0,
  }));
}

function rankPlayers(stats) {
  return [...stats].sort((a, b) => b.net - a.net || b.winRate - a.winRate);
}

// Fun auto-generated title for a player.
function playerTitle(st) {
  if (st.comebacks > 0 && st.busts >= 2 && st.net > 0) return "The Phoenix";
  if (st.sessions > 0 && st.busts / st.sessions >= 1.5) return "ATM Berjalan";
  if (st.sessions >= 2 && st.winRate >= 60) return "The Rock";
  if (st.net >= 100) return "High Roller";
  if (st.net > 0) return "Rising Star";
  return "Rookie";
}

function totals(sessions) {
  return {
    sessions: sessions.length,
    rounds: sessions.reduce((a, s) => a + (s.rounds || 0), 0),
    tax: sessions.reduce((a, s) => a + (s.total_tax || s.tax || 0), 0),
    last: sessions.length ? sessions[sessions.length - 1].date : "-",
  };
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtNet(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function netClass(n) {
  return n > 0 ? "pos" : n < 0 ? "neg" : "neu";
}

function avatarColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function avatarHtml(name, big) {
  return `<span class="avatar${big ? " big" : ""}" style="background:${avatarColor(name)}">${esc(name.charAt(0).toUpperCase())}</span>`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Animate a number from 0 to its target value.
function countUp(el, target, duration = 700) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Theme handling (dark by default, persisted in localStorage).
function initTheme(onChange) {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = document.getElementById("themeToggle");
  const sync = () => {
    btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
  };
  sync();
  btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    sync();
    if (onChange) onChange();
  });
}
