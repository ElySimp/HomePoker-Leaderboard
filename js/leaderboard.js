// Leaderboard page: category tabs, global stats, podium, ranking table and charts.

let allSessions = [];
let currentCategory = "all";
let charts = [];

function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

function renderTabs() {
  const cats = getCategories(allSessions);
  const items = [["all", "All Games"], ...cats.map((c) => [c, c])];
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = items
    .map(([key, label]) => `<button class="tab${key === currentCategory ? " active" : ""}" data-cat="${esc(key)}">${esc(label)}</button>`)
    .join("");
  tabs.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.cat;
      render();
    })
  );
}

function renderGlobalStats(sessions) {
  const t = totals(sessions);
  const cards = [
    ["Total Sesi", t.sessions, "malam main"],
    ["Total Round", t.rounds, "round dimainkan"],
    ["Kas Terkumpul", t.tax, "chip dari tax"],
  ];
  const el = document.getElementById("globalStats");
  el.innerHTML =
    cards
      .map(([label, val, sub]) => `<div class="card stat"><div class="label">${label}</div><div class="value" data-count="${val}">0</div><div class="sub">${sub}</div></div>`)
      .join("") +
    `<div class="card stat"><div class="label">Sesi Terakhir</div><div class="value" style="font-size:22px;padding-top:8px">${esc(t.last)}</div><div class="sub">tanggal main</div></div>`;
  el.querySelectorAll("[data-count]").forEach((n) => countUp(n, Number(n.dataset.count)));
}

function renderPodium(ranked) {
  const medals = ["🥇", "🥈", "🥉"];
  const order = [1, 0, 2].filter((i) => ranked[i]);
  return `<div class="podium">${order
    .map((i) => {
      const p = ranked[i];
      return `<a class="podium-item rank-${i + 1}" href="player.html?name=${encodeURIComponent(p.name)}">
        <div class="medal">${medals[i]}</div>
        ${avatarHtml(p.name)}
        <div class="pname">${esc(p.name)}</div>
        <div class="pnet ${netClass(p.net)}">${fmtNet(p.net)}</div>
      </a>`;
    })
    .join("")}</div>`;
}

function renderTable(ranked) {
  const rows = ranked
    .map(
      (p, i) => `<tr class="player-row" data-name="${esc(p.name)}">
        <td><div class="name-cell"><span class="rank-num">${i + 1}</span>${avatarHtml(p.name)}${esc(p.name)}</div></td>
        <td class="${netClass(p.net)}"><b>${fmtNet(p.net)}</b></td>
        <td>${p.winRate}%</td>
        <td>${p.wins}/${p.draws}/${p.losses}</td>
        <td>${p.sessions}</td>
        <td>${p.busts}</td>
      </tr>`
    )
    .join("");
  return `<div class="card"><h2>Ranking</h2><div class="table-wrap"><table>
    <thead><tr><th>Pemain</th><th>Net Chips</th><th>Win Rate</th><th>W/D/L</th><th>Sesi</th><th>Bust</th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>`;
}

function chartDefaults() {
  const muted = cssVar("--muted");
  const grid = cssVar("--grid");
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { labels: { color: muted, usePointStyle: true } } },
    scales: {
      x: { ticks: { color: muted }, grid: { color: grid } },
      y: { ticks: { color: muted }, grid: { color: grid } },
    },
  };
}

function renderCharts(sessions, ranked) {
  destroyCharts();
  const dates = [...new Set(sessions.map((s) => s.date))];
  const stats = buildPlayerStats(sessions);

  // Cumulative net chips per player by date.
  const lineSets = ranked.map((p) => {
    let run = 0;
    const data = dates.map((d) => {
      sessions.filter((s) => s.date === d).forEach((s) => {
        const pl = s.players.find((x) => x.name === p.name);
        if (pl) run += pl.net;
      });
      return run;
    });
    const color = avatarColor(p.name);
    return { label: p.name, data, borderColor: color, backgroundColor: color, tension: 0.35, pointRadius: 4 };
  });

  // Daily net chips (grouped bars).
  const barSets = stats.map((p) => ({
    label: p.name,
    backgroundColor: avatarColor(p.name),
    borderRadius: 6,
    data: dates.map((d) =>
      sessions.filter((s) => s.date === d).reduce((a, s) => {
        const pl = s.players.find((x) => x.name === p.name);
        return a + (pl ? pl.net : 0);
      }, 0)
    ),
  }));

  charts.push(new Chart(document.getElementById("lineChart"), { type: "line", data: { labels: dates, datasets: lineSets }, options: chartDefaults() }));
  charts.push(new Chart(document.getElementById("barChart"), { type: "bar", data: { labels: dates, datasets: barSets }, options: chartDefaults() }));
}

function render() {
  renderTabs();
  const sessions = filterSessions(allSessions, currentCategory);
  renderGlobalStats(sessions);
  const content = document.getElementById("content");

  if (!sessions.length) {
    content.innerHTML = `<div class="card empty">Belum ada riwayat untuk kategori ini. 🃏</div>`;
    destroyCharts();
    return;
  }

  const ranked = rankPlayers(buildPlayerStats(sessions));
  content.innerHTML =
    renderPodium(ranked) +
    renderTable(ranked) +
    `<div class="grid-2">
      <div class="card"><h2>Total Chip Kumulatif</h2><div class="chart-box"><canvas id="lineChart"></canvas></div></div>
      <div class="card"><h2>Chip Harian</h2><div class="chart-box"><canvas id="barChart"></canvas></div></div>
    </div>`;

  content.querySelectorAll(".player-row").forEach((row) =>
    row.addEventListener("click", () => {
      window.location.href = `player.html?name=${encodeURIComponent(row.dataset.name)}`;
    })
  );
  renderCharts(sessions, ranked);
}

async function init() {
  initTheme(() => render());
  try {
    allSessions = await loadSessions();
  } catch (e) {
    document.getElementById("content").innerHTML = `<div class="card empty">Gagal memuat data. Jalankan lewat server (python -m http.server) atau GitHub Pages.</div>`;
    return;
  }
  render();
}

init();
