// Player profile page (Chess.com-style): Donut Win-Rate Chart, 3x2 Stat Grid, Trend Chart, Heatmap & Match Log.

let allSessions = [];
let playerName = "";
let category = "all";
let trendChart = null;
let donutChart = null;

function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function statCard(label, value, cls = "", sub = "") {
  return `<div class="card stat">
    <div class="label">${label}</div>
    <div class="value ${cls}">${value}</div>
    <div class="sub">${sub}</div>
  </div>`;
}

function renderHeatmap(history) {
  const daily = {};
  history.forEach((h) => {
    daily[h.date] = (daily[h.date] || 0) + h.net;
  });
  const maxAbs = Math.max(1, ...Object.values(daily).map(Math.abs));

  const lastPlayed = history.length ? parseDate(history[history.length - 1].date) : new Date();
  const end = lastPlayed > new Date() ? lastPlayed : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7 * 17);
  start.setDate(start.getDate() - start.getDay());

  let cells = "";
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    const net = daily[key];
    let style = "";
    let title = key;
    if (net !== undefined) {
      const alpha = (0.35 + 0.65 * (Math.abs(net) / maxAbs)).toFixed(2);
      const color = net > 0 ? "48,209,88" : net < 0 ? "255,69,58" : "142,142,147";
      style = `style="background:rgba(${color},${alpha})"`;
      title += ` : ${fmtNet(net)} chips`;
    }
    cells += `<div class="hm-cell" ${style} title="${title}"></div>`;
  }
  return `<div class="heatmap">${cells}</div>
    <div class="hm-legend">
      <span><span class="dot" style="background:var(--green)"></span>Winning Day</span>
      <span><span class="dot" style="background:var(--red)"></span>Losing Day</span>
      <span>Darker tone = larger chip delta</span>
    </div>`;
}

function renderHistory(history) {
  const rows = [...history]
    .reverse()
    .map((h) => {
      const bust = h.bust_count > 0 ? `<span class="neg">${h.bust_count}x</span>` : "-";
      return `<tr>
        <td>${esc(h.date)}</td>
        <td>${esc(h.category)}</td>
        <td>${h.buy_in}</td>
        <td>${bust}</td>
        <td>${h.final_chips}</td>
        <td class="${netClass(h.net)}"><b>${fmtNet(h.net)}</b></td>
        <td><span class="pill ${h.status}">${h.status.toUpperCase()}</span></td>
      </tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Game</th><th>Buy-In</th><th>Busts</th><th>Final</th><th>Net</th><th>Result</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function renderDonutChart(st) {
  if (donutChart) donutChart.destroy();
  const canvas = document.getElementById("winRateDonut");
  if (!canvas) return;

  const green = cssVar("--green") || "#30D158";
  const gray = cssVar("--muted") || "#8E8E93";
  const red = cssVar("--red") || "#FF453A";

  donutChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Wins", "Draws", "Losses"],
      datasets: [
        {
          data: [st.wins, st.draws, st.losses],
          backgroundColor: [green, gray, red],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} match (${Math.round((ctx.raw / st.sessions) * 100)}%)`,
          },
        },
      },
    },
  });
}

function renderTrend(history) {
  if (trendChart) trendChart.destroy();
  const muted = cssVar("--muted");
  const grid = cssVar("--grid");
  const color = avatarColor(playerName);
  const labels = history.map((h, i) => `${h.date} #${i + 1}`);

  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  trendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cumulative Net Chips",
          data: history.map((h) => h.cumulative),
          borderColor: color,
          backgroundColor: color + "33",
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: muted, font: { size: 11 } }, grid: { color: grid } },
        y: { ticks: { color: muted, font: { size: 11 } }, grid: { color: grid } },
      },
    },
  });
}

function render() {
  const root = document.getElementById("profile");
  const filteredSessions = filterSessions(allSessions, category);
  const stats = buildPlayerStats(filteredSessions);
  const st = stats.find((s) => s.name === playerName);
  const cats = getCategories(allSessions);

  // Player rank tier with Elo
  const tier = getPlayerTier(playerName);

  const knownGames = ["Texas Hold'em", "Blackjack", "Baccarat"];
  const allGameSet = new Set([...knownGames, ...cats]);
  const gameList = [...allGameSet];

  const select = `<select class="select" id="catSelect">
    <option value="all">Net Worth</option>
    ${gameList.map((c) => `<option value="${esc(c)}"${c === category ? " selected" : ""}>${esc(c)}</option>`).join("")}
  </select>`;

  const head = `<section class="profile-head">
    ${avatarHtml(playerName, true)}
    <div>
      <h1>${esc(playerName)}</h1>
      <span class="tier-badge ${tier.cls}">${tier.icon} ${tier.title} • ${tier.elo} Elo</span>
    </div>
    <div style="margin-left:auto">${select}</div>
  </section>`;

  if (!st) {
    root.innerHTML = head + `<div class="card empty">No match data found for this player in this category.</div>`;
    bindFilter();
    return;
  }

  // 1. Donut Chart on Left (Win Rate circle) + 3x2 Grid on Right
  const overviewSplit = `
    <div class="profile-overview-split">
      <!-- Left: Circular Win Rate Donut -->
      <div class="card donut-card">
        <h2>Win Rate Breakdown</h2>
        <div class="donut-chart-container">
          <canvas id="winRateDonut"></canvas>
          <div class="donut-center-text">
            <div class="donut-center-rate">${st.winRate}%</div>
            <div class="donut-center-label">Win Rate</div>
          </div>
        </div>
        <div class="wdl-legend" style="justify-content:center;margin-top:6px">
          <span><span class="dot" style="background:var(--green)"></span>${st.wins}W</span>
          <span><span class="dot" style="background:var(--muted)"></span>${st.draws}D</span>
          <span><span class="dot" style="background:var(--red)"></span>${st.losses}L</span>
        </div>
      </div>

      <!-- Right: 3x2 Grid of Key Stats -->
      <div class="grid-3x2">
        ${statCard("Total Net Chips", fmtNet(st.net), netClass(st.net), "career profit / loss")}
        ${statCard("Win Rate", st.winRate + "%", "", `${st.sessions} matches played`)}
        ${statCard("Total Busts", st.busts, st.busts > 0 ? "neg" : "neu", "times re-bought chips")}
        ${statCard("Best Night", fmtNet(st.best.net), netClass(st.best.net), st.best.date)}
        ${statCard("Worst Night", fmtNet(st.worst.net), netClass(st.worst.net), st.worst.date)}
        ${statCard("Best Win Streak", st.bestStreak, "", "consecutive session wins")}
      </div>
    </div>
  `;

  root.innerHTML =
    head +
    overviewSplit +
    `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header-flex">
        <h2>Cumulative Net Chips Trend</h2>
        <span class="badge-tag">Bankroll Curve</span>
      </div>
      <div class="chart-box"><canvas id="trendChart"></canvas></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header-flex">
        <h2>Daily Activity Heatmap</h2>
        <span class="badge-tag">Session History</span>
      </div>
      ${renderHeatmap(st.history)}
    </div>

    <div class="card">
      <div class="card-header-flex">
        <h2>Recent Match History</h2>
        <span class="badge-tag">Detailed Logs</span>
      </div>
      ${renderHistory(st.history)}
    </div>
  `;

  renderDonutChart(st);
  renderTrend(st.history);
  bindFilter();
}

function bindFilter() {
  const sel = document.getElementById("catSelect");
  if (sel) {
    sel.addEventListener("change", () => {
      category = sel.value;
      render();
    });
  }
}

async function init() {
  playerName = new URLSearchParams(window.location.search).get("name") || "";
  initTheme(() => render());
  try {
    allSessions = await loadSessions();
  } catch (e) {
    document.getElementById("profile").innerHTML = `<div class="card empty">Failed to load data. Run via a local server (python -m http.server) or GitHub Pages.</div>`;
    return;
  }
  render();
}

init();
