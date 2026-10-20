// Leaderboard page: 2/3 Left (Podium on top + 10-player Paginated Standings) & 1/3 Right (Top 5 Cumulative Line + Daily Bar Charts + Hall of Fame Highlights).

let allSessions = [];
let currentCategory = ""; // Will default to "Texas Hold'em" on initial load
let currentPage = 1;
const PAGE_SIZE = 10;
let charts = [];

function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

function renderTabs() {
  const cats = getCategories(allSessions);
  const knownGames = ["Texas Hold'em", "Blackjack", "Baccarat"];
  const allGameSet = new Set([...knownGames, ...cats]);
  const gameList = [...allGameSet];

  // Default to Texas Hold'em on initial load if available, else Net Worth ("all")
  if (!currentCategory) {
    currentCategory = gameList.includes("Texas Hold'em") ? "Texas Hold'em" : "all";
  }

  // "Net Worth" is first, followed by specific card games
  const items = [["all", "Net Worth"], ...gameList.map((c) => [c, c])];
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = items
    .map(([key, label]) => `<button class="tab${key === currentCategory ? " active" : ""}" data-cat="${esc(key)}">${esc(label)}</button>`)
    .join("");
  tabs.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.cat;
      currentPage = 1;
      render();
    })
  );
}

function renderGlobalStats(sessions) {
  const t = totals(sessions);
  const cards = [
    ["Total Sessions", t.sessions, "game nights"],
    ["Total Rounds", t.rounds, "rounds played"],
    ["House Rake", t.tax, "chips collected"],
  ];
  const el = document.getElementById("globalStats");
  el.innerHTML =
    cards
      .map(([label, val, sub]) => `<div class="card stat"><div class="label">${label}</div><div class="value" data-count="${val}">0</div><div class="sub">${sub}</div></div>`)
      .join("") +
    `<div class="card stat"><div class="label">Last Session</div><div class="value" style="font-size:22px;padding-top:8px">${esc(t.last)}</div><div class="sub">latest match</div></div>`;
  el.querySelectorAll("[data-count]").forEach((n) => countUp(n, Number(n.dataset.count)));
}

function renderTopPodium(ranked) {
  const medals = ["🥇", "🥈", "🥉"];
  const order = [1, 0, 2].filter((i) => ranked[i]);
  if (!order.length) return "";
  return `<div class="card">
    <div class="card-header-flex">
      <h2>Top Podium</h2>
      <span class="badge-tag">Ranks 1 - 3</span>
    </div>
    <div class="podium-banner">${order
      .map((i) => {
        const p = ranked[i];
        return `<a class="podium-item rank-${i + 1}" href="player.html?name=${encodeURIComponent(p.name)}">
          <div class="medal">${medals[i]}</div>
          ${avatarHtml(p.name)}
          <div class="pname">${esc(p.name)}</div>
          <div class="pnet ${netClass(p.net)}">${fmtNet(p.net)}</div>
        </a>`;
      })
      .join("")}</div>
  </div>`;
}

function renderHighlights(sessions, ranked) {
  if (!ranked.length) return "";

  // 1. Current Leader
  const leader = ranked[0];

  // 2. Best single session profit across all matches with date
  let bestSingle = null;
  sessions.forEach((s) => {
    s.players.forEach((p) => {
      if (!bestSingle || p.net > bestSingle.net) {
        bestSingle = {
          name: p.name,
          net: p.net,
          date: s.date,
          category: s.category || "Texas Hold'em",
        };
      }
    });
  });

  // 3. Most rounds in a single session (Marathon Match) with date
  let marathonSession = null;
  sessions.forEach((s) => {
    const rounds = s.rounds || s.total_tax || s.tax || 0;
    if (!marathonSession || rounds > (marathonSession.rounds || 0)) {
      marathonSession = {
        date: s.date,
        rounds: rounds,
        category: s.category || "Texas Hold'em",
        tax: s.total_tax || s.tax || 0,
      };
    }
  });

  // 4. Most career busts
  const mostBust = [...ranked].sort((a, b) => b.busts - a.busts)[0];

  return `<div class="card">
    <div class="card-header-flex">
      <h2>Hall of Fame</h2>
      <span class="badge-tag">Records</span>
    </div>
    <div class="highlight-list">
      <!-- Leader -->
      <div class="highlight-row">
        <div class="hl-left">
          <span class="hl-icon">👑</span>
          <div>
            <div class="hl-title">Current Leader</div>
            <div class="hl-player">${esc(leader.name)}</div>
          </div>
        </div>
        <div class="hl-val ${netClass(leader.net)}">${fmtNet(leader.net)}</div>
      </div>

      <!-- Single-Night Record -->
      ${
        bestSingle
          ? `<div class="highlight-row">
              <div class="hl-left">
                <span class="hl-icon">🔥</span>
                <div>
                  <div class="hl-title">Single-Night Record • <span style="color:var(--text)">${esc(bestSingle.date)}</span></div>
                  <div class="hl-player">${esc(bestSingle.name)} <span style="font-size:11px;color:var(--muted)">(${esc(bestSingle.category)})</span></div>
                </div>
              </div>
              <div class="hl-val pos">+${bestSingle.net}</div>
            </div>`
          : ""
      }

      <!-- Longest Game / Most Rounds -->
      ${
        marathonSession && marathonSession.rounds > 0
          ? `<div class="highlight-row">
              <div class="hl-left">
                <span class="hl-icon">⏱️</span>
                <div>
                  <div class="hl-title">Most Rounds in 1 Match • <span style="color:var(--text)">${esc(marathonSession.date)}</span></div>
                  <div class="hl-player">${esc(marathonSession.category)}</div>
                </div>
              </div>
              <div class="hl-val" style="color:var(--amber)">${marathonSession.rounds} Rnds</div>
            </div>`
          : ""
      }

      <!-- Most Busted -->
      ${
        mostBust && mostBust.busts > 0
          ? `<div class="highlight-row">
              <div class="hl-left">
                <span class="hl-icon">💀</span>
                <div>
                  <div class="hl-title">Most Busted ("ATM") • Career</div>
                  <div class="hl-player">${esc(mostBust.name)}</div>
                </div>
              </div>
              <div class="hl-val neg">${mostBust.busts}x bust</div>
            </div>`
          : ""
      }
    </div>
  </div>`;
}

function renderStandingsTable(ranked) {
  const totalPlayers = ranked.length;
  const totalPages = Math.ceil(totalPlayers / PAGE_SIZE) || 1;
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalPlayers);
  const pagedList = ranked.slice(startIdx, endIdx);

  const rows = pagedList
    .map((p, i) => {
      const globalRank = startIdx + i + 1;
      let badgeClass = "";
      if (globalRank === 1) badgeClass = " rank-1";
      else if (globalRank === 2) badgeClass = " rank-2";
      else if (globalRank === 3) badgeClass = " rank-3";

      const tier = getPlayerTier(p.name);

      return `<tr class="player-row" data-name="${esc(p.name)}">
        <td>
          <div class="name-cell">
            <span class="rank-badge${badgeClass}">${globalRank}</span>
            ${avatarHtml(p.name)}
            <div>
              <div>${esc(p.name)}</div>
              <div style="font-size:11px;color:var(--muted)">${tier.icon} ${tier.title} • <span style="color:var(--blue);font-weight:700">${tier.elo} Elo</span></div>
            </div>
          </div>
        </td>
        <td class="${netClass(p.net)}"><b>${fmtNet(p.net)}</b></td>
        <td><b>${p.winRate}%</b> <span style="color:var(--muted);font-size:12px">(${p.wins}W ${p.losses}L)</span></td>
        <td>${p.sessions}</td>
        <td>${p.busts > 0 ? `<span class="neg">${p.busts}x</span>` : "-"}</td>
      </tr>`;
    })
    .join("");

  const paginationHtml =
    totalPlayers > PAGE_SIZE
      ? `<div class="pagination">
          <div class="page-info">Showing ${startIdx + 1} - ${endIdx} of ${totalPlayers} players</div>
          <div class="page-controls">
            <button class="page-btn" id="prevBtn" ${currentPage === 1 ? "disabled" : ""}>‹ Prev</button>
            <button class="page-btn" id="nextBtn" ${currentPage >= totalPages ? "disabled" : ""}>Next ›</button>
          </div>
        </div>`
      : `<div class="pagination"><div class="page-info">Total ${totalPlayers} active players</div></div>`;

  return `<div class="card">
    <div class="card-header-flex">
      <h2>Player Standings</h2>
      <span class="badge-tag">Page ${currentPage} / ${totalPages}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Net Chips</th>
            <th>Win Rate</th>
            <th>Sessions</th>
            <th>Busts</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${paginationHtml}
  </div>`;
}

function chartDefaults() {
  const muted = cssVar("--muted");
  const grid = cssVar("--grid");
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: muted,
          usePointStyle: true,
          font: { size: 11 },
        },
      },
    },
    scales: {
      x: { ticks: { color: muted, font: { size: 10 } }, grid: { color: grid } },
      y: { ticks: { color: muted, font: { size: 10 } }, grid: { color: grid } },
    },
  };
}

function renderSidebarCharts(sessions, ranked) {
  destroyCharts();
  const dates = [...new Set(sessions.map((s) => s.date))];

  // Only take Top 5 players by Net Chips to avoid messy cluttered charts
  const top5 = ranked.slice(0, 5);

  // 1. Cumulative Line Chart (Top 5)
  const lineSets = top5.map((p) => {
    let run = 0;
    const data = dates.map((d) => {
      sessions
        .filter((s) => s.date === d)
        .forEach((s) => {
          const pl = s.players.find((x) => x.name === p.name);
          if (pl) run += pl.net;
        });
      return run;
    });
    const color = avatarColor(p.name);
    return {
      label: p.name,
      data,
      borderColor: color,
      backgroundColor: color,
      tension: 0.35,
      pointRadius: 4,
    };
  });

  const lineCanvas = document.getElementById("top5LineChart");
  if (lineCanvas) {
    charts.push(
      new Chart(lineCanvas, {
        type: "line",
        data: { labels: dates, datasets: lineSets },
        options: chartDefaults(),
      })
    );
  }

  // 2. Daily Bar Chart (Top 5)
  const barSets = top5.map((p) => ({
    label: p.name,
    backgroundColor: avatarColor(p.name),
    borderRadius: 5,
    data: dates.map((d) =>
      sessions
        .filter((s) => s.date === d)
        .reduce((acc, s) => {
          const pl = s.players.find((x) => x.name === p.name);
          return acc + (pl ? pl.net : 0);
        }, 0)
    ),
  }));

  const barCanvas = document.getElementById("top5BarChart");
  if (barCanvas) {
    charts.push(
      new Chart(barCanvas, {
        type: "bar",
        data: { labels: dates, datasets: barSets },
        options: chartDefaults(),
      })
    );
  }
}

function renderGameArena(category) {
  if (category === "Blackjack") {
    return `<div class="card game-arena-card">
      <div class="arena-header">
        <div class="arena-icon-badge">🃏</div>
        <div>
          <div class="arena-tag">Table Game</div>
          <h2>Blackjack Arena</h2>
          <p class="arena-sub">Classic 21 • Beat the Dealer • Double Down & Split</p>
        </div>
      </div>
      <div class="arena-grid">
        <div class="arena-rule-box">
          <div class="rule-icon">⚖️</div>
          <div class="rule-title">Standard Rules</div>
          <div class="rule-desc">Blackjack pays 3:2 • Dealer stands on soft 17 • Double on any 2 cards • Insurance pays 2:1.</div>
        </div>
        <div class="arena-rule-box">
          <div class="rule-icon">🪙</div>
          <div class="rule-title">House Bankroll & Tax</div>
          <div class="rule-desc">Communal table rake (1 chip/round) tracked automatically to preserve zero-sum ledger balance.</div>
        </div>
        <div class="arena-rule-box">
          <div class="rule-icon">⚡</div>
          <div class="rule-title">Multi-player Elo</div>
          <div class="rule-desc">Head-to-head performance updates your Elo rating and advances your rank tier towards Grandmaster.</div>
        </div>
      </div>
      <div class="arena-footer">
        <div class="arena-notice">
          <span class="notice-icon">🚀</span>
          <div>
            <b>Ready to deal Blackjack?</b>
            <div>Open <code>poker_input_app.py</code>, switch the category dropdown to <b>Blackjack</b>, select your active players, and save your first session!</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  if (category === "Baccarat") {
    return `<div class="card game-arena-card">
      <div class="arena-header">
        <div class="arena-icon-badge">🎴</div>
        <div>
          <div class="arena-tag">High Stakes Salon</div>
          <h2>Baccarat Salon</h2>
          <p class="arena-sub">Punto Banco • Banker, Player & Tie Bets</p>
        </div>
      </div>
      <div class="arena-grid">
        <div class="arena-rule-box">
          <div class="rule-icon">💎</div>
          <div class="rule-title">Coup Scoring</div>
          <div class="rule-desc">Target score closest to 9 • 10s and face cards count as 0 • Naturals 8 or 9 win automatically.</div>
        </div>
        <div class="arena-rule-box">
          <div class="rule-icon">🏦</div>
          <div class="rule-title">Commission & House Rake</div>
          <div class="rule-desc">Banker 5% commission / Dragon 7 • Table rake recorded per shoe or round.</div>
        </div>
        <div class="arena-rule-box">
          <div class="rule-icon">📈</div>
          <div class="rule-title">Career Bankroll</div>
          <div class="rule-desc">All net chip profits in Baccarat contribute directly to your career <b>Net Worth</b> leaderboard.</div>
        </div>
      </div>
      <div class="arena-footer">
        <div class="arena-notice">
          <span class="notice-icon">🚀</span>
          <div>
            <b>Ready to play Baccarat?</b>
            <div>Open <code>poker_input_app.py</code>, switch the category dropdown to <b>Baccarat</b>, and record your inaugural salon game!</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  return `<div class="card game-arena-card">
    <div class="arena-header">
      <div class="arena-icon-badge">🎲</div>
      <div>
        <div class="arena-tag">Custom Table</div>
        <h2>${esc(category)}</h2>
        <p class="arena-sub">No match sessions recorded for this category yet.</p>
      </div>
    </div>
    <div class="arena-footer">
      <div class="arena-notice">
        <span class="notice-icon">🚀</span>
        <div>
          <b>Start tracking games:</b>
          <div>Open <code>poker_input_app.py</code>, choose <b>${esc(category)}</b>, and save your results to see rankings and charts appear here!</div>
        </div>
      </div>
    </div>
  </div>`;
}

function render() {
  renderTabs();
  const sessions = filterSessions(allSessions, currentCategory);
  renderGlobalStats(sessions);
  const content = document.getElementById("content");

  if (!sessions.length) {
    content.innerHTML = renderGameArena(currentCategory);
    destroyCharts();
    return;
  }

  const ranked = rankPlayers(buildPlayerStats(sessions));

  // Layout: 2/3 on Left (Top Podium on Top + Standings Table below)
  // & 1/3 on Right (Top 5 Line Chart + Top 5 Daily Bar Chart + Highlights)
  content.innerHTML = `
    <div class="split-layout">
      <!-- 2/3 Left Column: Top Podium followed by Full Standings Table -->
      <div class="col-left-main">
        ${renderTopPodium(ranked)}
        ${renderStandingsTable(ranked)}
      </div>

      <!-- 1/3 Right Column: Top 5 Cumulative Line + Daily Bar Charts + Hall of Fame Highlights -->
      <div class="col-right-sidebar">
        <div class="card">
          <div class="card-header-flex">
            <h2>Top 5 Cumulative</h2>
            <span class="badge-tag">Trend Line</span>
          </div>
          <div class="chart-box-side">
            <canvas id="top5LineChart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header-flex">
            <h2>Top 5 Daily Chips</h2>
            <span class="badge-tag">Session Delta</span>
          </div>
          <div class="chart-box-side">
            <canvas id="top5BarChart"></canvas>
          </div>
        </div>

        ${renderHighlights(sessions, ranked)}
      </div>
    </div>
  `;

  // Bind click on player row to open profile
  content.querySelectorAll(".player-row").forEach((row) =>
    row.addEventListener("click", () => {
      window.location.href = `player.html?name=${encodeURIComponent(row.dataset.name)}`;
    })
  );

  // Bind pagination buttons
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        render();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(ranked.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage++;
        render();
      }
    });
  }

  // Render Charts for Top 5
  renderSidebarCharts(sessions, ranked);
}

async function init() {
  initTheme(() => render());
  try {
    allSessions = await loadSessions();
  } catch (e) {
    document.getElementById("content").innerHTML = `<div class="card empty">Failed to load data. Run via a local server (python -m http.server) or GitHub Pages.</div>`;
    return;
  }
  render();
}

init();
