// Shared data loading, statistics, custom profiles, and manual rank tiers.

const DATA_URL = "data/poker_data.json";
const PLAYERS_URL = "data/players.json";

// Default Apple color palette fallback
const DEFAULT_PALETTE = [
  "#0A84FF", // Apple Blue
  "#30D158", // Mint Green
  "#FF9F0A", // Orange
  "#BF5AF2", // Purple
  "#FF453A", // Coral Red
  "#64D2FF", // Cyan
  "#FF375F", // Hot Pink
  "#5E5CE6", // Indigo
  "#FFD60A", // Gold
  "#D9915B", // Teak Bronze
];

// Available 10 Manual & Elo Rank Tiers (Rookie 100 to Grandmaster 1250+)
const TIER_THRESHOLDS = [
  { min: 1250, title: "Grandmaster", icon: "👑", cls: "tier-grandmaster" },
  { min: 1150, title: "Master", icon: "⭐", cls: "tier-master" },
  { min: 1050, title: "Expert", icon: "💠", cls: "tier-expert" },
  { min: 950, title: "Senior", icon: "🎖️", cls: "tier-senior" },
  { min: 850, title: "Advanced", icon: "⚡", cls: "tier-advanced" },
  { min: 750, title: "Intermediate", icon: "🔷", cls: "tier-intermediate" },
  { min: 650, title: "Junior", icon: "🔹", cls: "tier-junior" },
  { min: 550, title: "Apprentice", icon: "🎯", cls: "tier-apprentice" },
  { min: 450, title: "Novice", icon: "🔰", cls: "tier-novice" },
  { min: 100, title: "Rookie", icon: "🛡️", cls: "tier-rookie" },
];

const KNOWN_TIERS = {
  "Grandmaster": { title: "Grandmaster", icon: "👑", cls: "tier-grandmaster" },
  "Master": { title: "Master", icon: "⭐", cls: "tier-master" },
  "Expert": { title: "Expert", icon: "💠", cls: "tier-expert" },
  "Senior": { title: "Senior", icon: "🎖️", cls: "tier-senior" },
  "Advanced": { title: "Advanced", icon: "⚡", cls: "tier-advanced" },
  "Intermediate": { title: "Intermediate", icon: "🔷", cls: "tier-intermediate" },
  "Junior": { title: "Junior", icon: "🔹", cls: "tier-junior" },
  "Apprentice": { title: "Apprentice", icon: "🎯", cls: "tier-apprentice" },
  "Novice": { title: "Novice", icon: "🔰", cls: "tier-novice" },
  "Rookie": { title: "Rookie", icon: "🛡️", cls: "tier-rookie" },
};

let playerCustomProfiles = {};
let calculatedEloRatings = {};
let sessionPlayerEloChanges = {};

// Multi-player pairwise Elo calculation (Start: 400, Floor: 100)
// Exclusively calculates Elo for Texas Hold'em (skill-based player-vs-player poker).
// Features: Bust-Free Shield (cushions disciplined survival), Dominance Multiplier (rewards crushing short sessions),
// Killer Instinct (Chip Velocity in short rounds) & Tax Resistance (Endurance in long sessions).
function computeAllEloRatings(sessions) {
  const ratings = {};
  sessionPlayerEloChanges = {};

  // Sort sessions chronologically
  const sorted = [...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.timestamp || "").localeCompare(b.timestamp || "")
  );

  sorted.forEach((session) => {
    const sId = session.session_id || `${session.date}_${session.timestamp || ""}`;
    sessionPlayerEloChanges[sId] = {};

    // Only calculate Elo for Texas Hold'em (exclude house/casino games like Blackjack/Baccarat)
    const category = session.category || "Texas Hold'em";
    if (category !== "Texas Hold'em") return;

    const players = session.players || [];
    const n = players.length;
    if (n < 2) return;

    // Ensure all players in this session have at least baseline rating (Start: 400)
    players.forEach((p) => {
      if (ratings[p.name] === undefined) {
        ratings[p.name] = 400;
      }
    });

    const deltas = {};
    players.forEach((p) => {
      deltas[p.name] = 0;
    });

    const baseK = 20;
    const sessionRounds = session.rounds && session.rounds > 0 ? session.rounds : 0;

    // Compute session-wide chip spread & total winning chips
    const nets = players.map((p) => p.net || 0);
    const maxNet = Math.max(...nets);
    const minNet = Math.min(...nets);
    const spread = Math.max(20, maxNet - minNet);
    const totalPositiveChips = nets.filter((x) => x > 0).reduce((a, b) => a + b, 0);

    // Pairwise decomposition
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pA = players[i];
        const pB = players[j];

        const rA = ratings[pA.name];
        const rB = ratings[pB.name];

        // Expected score
        const expA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
        const expB = 1 - expA;

        // 1. Finish order head-to-head score (softened when both players lose)
        let actA = 0.5;
        let actB = 0.5;
        if (pA.net > pB.net) {
          if (pA.net <= 0 && pB.net < 0) {
            // Both lost: softened relative finish (winner of loser bracket didn't crush)
            actA = Math.min(0.85, 0.5 + 0.35 * ((pA.net - pB.net) / spread));
            actB = 1.0 - actA;
          } else {
            actA = 1.0;
            actB = 0.0;
          }
        } else if (pA.net < pB.net) {
          if (pB.net <= 0 && pA.net < 0) {
            actB = Math.min(0.85, 0.5 + 0.35 * ((pB.net - pA.net) / spread));
            actA = 1.0 - actB;
          } else {
            actA = 0.0;
            actB = 1.0;
          }
        }

        // 2. Contextual Chip Gap within the night's table spread (-1.0 to +1.0)
        const chipGap = Math.max(-1.0, Math.min(1.0, (pA.net - pB.net) / spread));

        // 3. Killer Instinct / Velocity Factor (Chip win-rate per round)
        let velocityBonus = 0;
        if (sessionRounds > 0) {
          const paceA = (pA.net || 0) / Math.max(12, sessionRounds);
          const paceB = (pB.net || 0) / Math.max(12, sessionRounds);
          velocityBonus = Math.max(-0.8, Math.min(0.8, (paceA - paceB) / 8.0));
        }

        // 4. Round-Aware Risk Management & Bust Siphon
        // Penalizes rapid reckless bust; winner who took chips receives direct positive delta
        let bustAdj = 0;
        if (sessionRounds > 0) {
          const rateA = (pA.bust_count || 0) / Math.max(12, sessionRounds);
          const rateB = (pB.bust_count || 0) / Math.max(12, sessionRounds);
          bustAdj = Math.max(-0.6, Math.min(0.6, (rateB - rateA) * 3.5));
        }

        // 5. Bust-Free Shield (cushions disciplined players who lost without ever rebuying)
        const shieldA = (pA.bust_count === 0 && pA.net < 0) ? 0.35 : 0;
        const shieldB = (pB.bust_count === 0 && pB.net < 0) ? 0.35 : 0;
        const shieldAdj = shieldA - shieldB;

        // 6. Table Dominance & Share of Pot
        // Rewards a player who captured the vast majority of the table's profit
        const shareA = totalPositiveChips > 0 && pA.net > 0 ? (pA.net / totalPositiveChips) : 0;
        const shareB = totalPositiveChips > 0 && pB.net > 0 ? (pB.net / totalPositiveChips) : 0;
        const dominanceAdj = Math.max(-0.6, Math.min(0.6, (shareA - shareB) * 0.8));

        // 7. Tax Resistance & Iron Defense in Marathon Sessions (>= 35 rounds)
        let enduranceAdj = 0;
        if (sessionRounds >= 35) {
          const endA = (pA.bust_count === 0 ? 0.15 : 0) + (pA.net > 0 ? 0.15 : 0);
          const endB = (pB.bust_count === 0 ? 0.15 : 0) + (pB.net > 0 ? 0.15 : 0);
          const roundScale = Math.min(1.5, sessionRounds / 50);
          enduranceAdj = Math.max(-0.25, Math.min(0.25, (endA - endB) * roundScale));
        }

        const pairDelta = (baseK / (n - 1)) * (
          (actA - expA) +
          0.20 * chipGap +
          0.25 * velocityBonus +
          0.15 * bustAdj +
          0.20 * shieldAdj +
          0.15 * dominanceAdj +
          0.10 * enduranceAdj
        );

        deltas[pA.name] += pairDelta;
        deltas[pB.name] -= pairDelta;
      }
    }

    // Apply deltas with minimum floor of 100 and record per-match Elo shift
    players.forEach((p) => {
      const oldRating = ratings[p.name];
      const newRating = Math.max(100, Math.round((oldRating + deltas[p.name]) * 10) / 10);
      ratings[p.name] = newRating;
      sessionPlayerEloChanges[sId][p.name] = {
        delta: Math.round((newRating - oldRating) * 10) / 10,
        postElo: Math.round(newRating),
      };
    });
  });

  calculatedEloRatings = ratings;
  return ratings;
}

async function loadPlayerProfiles() {
  try {
    const res = await fetch(PLAYERS_URL, { cache: "no-store" });
    if (res.ok) {
      playerCustomProfiles = await res.json();
    }
  } catch (e) {
    playerCustomProfiles = {};
  }
}

async function loadSessions() {
  await loadPlayerProfiles();
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();
  const sessions = (json.sessions || [])
    .map((s) => ({ ...s, category: s.category || "Texas Hold'em" }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.timestamp || "").localeCompare(b.timestamp || ""));
  
  // Precompute Elo for all players across all chronological sessions
  computeAllEloRatings(sessions);
  return sessions;
}

function getCategories(sessions) {
  return [...new Set(sessions.map((s) => s.category))];
}

function filterSessions(sessions, category) {
  return category === "all" ? sessions : sessions.filter((s) => s.category === category);
}

// Build per-player statistics from a list of sessions
function buildPlayerStats(sessions) {
  const map = {};
  sessions.forEach((s) => {
    s.players.forEach((p) => {
      if (!map[p.name]) {
        map[p.name] = {
          name: p.name,
          net: 0,
          sessions: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          busts: 0,
          best: null,
          worst: null,
          history: [],
          streak: 0,
          bestStreak: 0,
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

      const sId = s.session_id || `${s.date}_${s.timestamp || ""}`;
      const eloInfo = sessionPlayerEloChanges[sId]?.[p.name];

      st.history.push({
        date: s.date,
        category: s.category,
        session_id: s.session_id,
        buy_in: p.buy_in,
        bust_count: p.bust_count || 0,
        final_chips: p.final_chips,
        net: p.net,
        status: p.status,
        cumulative: st.net,
        eloDelta: eloInfo !== undefined ? eloInfo.delta : null,
        postElo: eloInfo !== undefined ? eloInfo.postElo : null,
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

// Player Tier based on Elo Rating (Start: 400) with optional admin override
function getPlayerTier(playerName) {
  const profile = playerCustomProfiles[playerName] || {};

  // Prioritize explicit admin override in players.json if present, otherwise use dynamically calculated Elo
  let elo = 400;
  if (profile.elo !== undefined && profile.elo !== null && !isNaN(profile.elo)) {
    elo = Number(profile.elo);
  } else if (calculatedEloRatings[playerName] !== undefined) {
    elo = calculatedEloRatings[playerName];
  }

  // Determine tier based on Elo
  let matchedTier = TIER_THRESHOLDS.find((t) => elo >= t.min) || TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];

  // If admin set a custom manual title override, allow it
  if (profile.title && KNOWN_TIERS[profile.title]) {
    matchedTier = KNOWN_TIERS[profile.title];
  }

  return {
    title: matchedTier.title,
    icon: matchedTier.icon,
    cls: matchedTier.cls,
    elo: Math.round(elo),
  };
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
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function fmtNet(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function netClass(n) {
  return n > 0 ? "pos" : n < 0 ? "neg" : "neu";
}

function avatarColor(name) {
  if (playerCustomProfiles[name] && playerCustomProfiles[name].color) {
    return playerCustomProfiles[name].color;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DEFAULT_PALETTE[h % DEFAULT_PALETTE.length];
}

function avatarHtml(name, big = false) {
  const profile = playerCustomProfiles[name];
  const color = avatarColor(name);
  const bigCls = big ? " big" : "";

  if (profile && profile.avatar_url && profile.avatar_url.trim()) {
    return `<span class="avatar${bigCls}" style="border: 2px solid ${color}"><img src="${esc(profile.avatar_url)}" alt="${esc(name)}" /></span>`;
  }

  const initial = esc(name.charAt(0).toUpperCase());
  return `<span class="avatar${bigCls}" style="background:${color}">${initial}</span>`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Alternating info lines for compact mobile rows.
// Each ".rot-line" holds a JSON array in data-items; one global timer cycles all of them.
let rotatorTimer = null;
const ROTATE_INTERVAL_MS = 3000;

function rotLineHtml(items) {
  const safe = esc(JSON.stringify(items));
  return `<div class="rot-line" data-idx="0" data-items="${safe}">${items[0]}</div>`;
}

function startRotators() {
  if (rotatorTimer) return;
  rotatorTimer = setInterval(() => {
    document.querySelectorAll(".rot-line").forEach((el) => {
      let items;
      try {
        items = JSON.parse(el.dataset.items);
      } catch (e) {
        return;
      }
      if (!items || items.length < 2) return;
      const next = (Number(el.dataset.idx) + 1) % items.length;
      el.classList.add("rot-out");
      setTimeout(() => {
        el.dataset.idx = String(next);
        el.innerHTML = items[next];
        el.classList.remove("rot-out");
      }, 220);
    });
  }, ROTATE_INTERVAL_MS);
}

function countUp(el, target, duration = 700) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

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
