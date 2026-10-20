// Player profile page (Chess.com style): summary, W/D/L bar, trend chart, heatmap and match history.

let allSessions = [];
let playerName = "";
let category = "all";
let trendChart = null;

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
  return `<div class="card stat"><div class="label">${label}</div><div class="value ${cls}">${value}</div><div class="sub">${sub}</div></div>`;
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
      title += ` : ${fmtNet(net)} chip`;
    }
    cells += `<div class="hm-cell" ${style} title="${title}"></div>`;
  }
  return `<div class="heatmap">${cells}</div>
    <div class="hm-legend"><span><span class="dot" style="background:var(--green)"></span>Hari menang</span><span><span class="dot" style="background:var(--red)"></span>Hari kalah</span><span>Warna makin pekat = chip makin besar</span></div>`;
}

function renderHistory(history) {
  const rows = [...history]
    .reverse()
    .map((h) => {
      const bust = h.bust_count > 0 ? `<span class="neg">${h.bust_count}x</span>` : "-";
      return `<tr>
        <td>${esc(h.date)}</td><td>${esc(h.category)}</td><td>${h.buy_in}</td><td>${bust}</td><td>${h.final_chips}</td>
        <td class="${netClass(h.net)}"><b>${fmtNet(h.net)}</b></td>
        <td><span class="pill ${h.status}">${h.status.toUpperCase()}</span></td></tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table>
    <thead><tr><th>Tanggal</th><th>Game</th><th>Modal</th><th>Bust</th><th>Akhir</th><th>Net</th><th>Hasil</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function renderTrend(history) {
  if (trendChart) trendChart.destroy();
  const muted = cssVar("--muted");
  const grid = cssVar("--grid");
  const color = avatarColor(playerName);
  const labels = history.map((h, i) => `${h.date} #${i + 1}`);
  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Total chip",
        data: history.map((h) => h.cumulative),
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: muted }, grid: { color: grid } },
        y: { ticks: { color: muted }, grid: { color: grid } },
      },
    },
  });
}

function render() {
  const root = document.getElementById("profile");
  const stats = buildPlayerStats(filterSessions(allSessions, category));
  const st = stats.find((s) => s.name === playerName);
  const cats = getCategories(allSessions);

  const select = `<select class="select" id="catSelect">
    <option value="all">Semua Game</option>
    ${cats.map((c) => `<option value="${esc(c)}"${c === category ? " selected" : ""}>${esc(c)}</option>`).join("")}
  </select>`;

  // Title is always computed from all-time stats so it stays stable across filters.
  const overall = buildPlayerStats(allSessions).find((s) => s.name === playerName);
  const head = `<section class="profile-head">
    ${avatarHtml(playerName, true)}
    <div><h1>${esc(playerName)}</h1><span class="title-badge">${overall ? playerTitle(overall) : "Rookie"}</span></div>
    <div style="margin-left:auto">${select}</div>
  </section>`;

  if (!st) {
    root.innerHTML = head + `<div class="card empty">Belum ada data untuk pemain ini di kategori tersebut.</div>`;
    bindFilter();
    return;
  }

  const total = st.sessions;
  const w = (st.wins / total) * 100;
  const d = (st.draws / total) * 100;
  const l = (st.losses / total) * 100;

  root.innerHTML =
    head +
    `<section class="grid-stats">
      ${statCard("Total Net Chips", fmtNet(st.net), netClass(st.net))}
      ${statCard("Win Rate", st.winRate + "%", "", `${total} sesi`)}
      ${statCard("Total Bust", st.busts, st.busts > 0 ? "neg" : "neu", "kali kehabisan chip")}
      ${statCard("Best Night", fmtNet(st.best.net), netClass(st.best.net), st.best.date)}
      ${statCard("Worst Night", fmtNet(st.worst.net), netClass(st.worst.net), st.worst.date)}
      ${statCard("Win Streak", st.bestStreak, "", "rekor menang beruntun")}
    </section>
    <div class="card" style="margin-bottom:14px"><h2>Win / Draw / Loss</h2>
      <div class="wdl-bar">
        <div style="width:${w}%;background:var(--green)"></div>
        <div style="width:${d}%;background:var(--muted)"></div>
        <div style="width:${l}%;background:var(--red)"></div>
      </div>
      <div class="wdl-legend">
        <span><span class="dot" style="background:var(--green)"></span>Win ${st.wins}</span>
        <span><span class="dot" style="background:var(--muted)"></span>Draw ${st.draws}</span>
        <span><span class="dot" style="background:var(--red)"></span>Loss ${st.losses}</span>
      </div>
    </div>
    <div class="card" style="margin-bottom:14px"><h2>Tren Total Chip</h2><div class="chart-box"><canvas id="trendChart"></canvas></div></div>
    <div class="card" style="margin-bottom:14px"><h2>Aktivitas Harian</h2>${renderHeatmap(st.history)}</div>
    <div class="card"><h2>Riwayat Match</h2>${renderHistory(st.history)}</div>`;

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
    document.getElementById("profile").innerHTML = `<div class="card empty">Gagal memuat data. Jalankan lewat server (python -m http.server) atau GitHub Pages.</div>`;
    return;
  }
  render();
}

init();
