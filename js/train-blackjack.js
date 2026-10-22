// Real Casino Blackjack Trainer with Stealth Shoe, Bet Presets & Real-time Session Analytics Charts

(function () {
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SUITS = [
    { symbol: "♠", name: "spades", isRed: false },
    { symbol: "♥", name: "hearts", isRed: true },
    { symbol: "♦", name: "diamonds", isRed: true },
    { symbol: "♣", name: "clubs", isRed: false },
  ];

  // Shoe & Deck State
  let shoe = [];
  const TOTAL_DECKS = 6;
  const TOTAL_SHOE_CARDS = TOTAL_DECKS * 52; // 312 cards
  const CUT_CARD_THRESHOLD = 75;
  let pendingReshuffle = false;

  // Bankroll & Betting State
  let bankroll = 50; // Starting chips: exactly 50
  let totalRebuys = 0;
  let currentBet = 5;
  let inRound = false;

  // Round State
  let playerHands = [];
  let currentHandIndex = 0;
  let dealerCards = [];
  let dealerHoleHidden = true;
  let holeJustRevealed = false;

  // Session Statistics & Chart.js Instances
  let sessionWins = 0;
  let sessionLosses = 0;
  let sessionPushes = 0;
  let sessionBlackjacks = 0;
  let sessionRounds = 0;
  let trendLabels = ["Start"];
  let trendBankroll = [50];

  let donutChart = null;
  let trendLineChart = null;
  let isStatsPanelOpen = false;

  const DEAL_DELAY_MS = 250;

  function cardValue(rank) {
    if (rank === "A") return 11;
    if (["K", "Q", "J", "10"].includes(rank)) return 10;
    return parseInt(rank, 10);
  }

  function calculateScore(cards) {
    let score = 0;
    let aces = 0;

    cards.forEach((c) => {
      score += cardValue(c.rank);
      if (c.rank === "A") aces++;
    });

    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    const isSoft = aces > 0 && score <= 21;
    return { score, isSoft, isBust: score > 21 };
  }

  function buildAndShuffleShoe() {
    const newShoe = [];
    for (let d = 0; d < TOTAL_DECKS; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          newShoe.push({ rank, suit: suit.symbol, isRed: suit.isRed });
        }
      }
    }

    for (let i = newShoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newShoe[i], newShoe[j]] = [newShoe[j], newShoe[i]];
    }

    shoe = newShoe;
    pendingReshuffle = false;
    updateShuffleIndicator();
  }

  function dealCard() {
    if (shoe.length <= CUT_CARD_THRESHOLD) {
      pendingReshuffle = true;
    }
    if (shoe.length === 0) {
      buildAndShuffleShoe();
    }
    const card = shoe.pop();
    updateShuffleIndicator();
    return card;
  }

  function updateShuffleIndicator() {
    const roundsDisp = document.getElementById("bjRoundsUntilShuffle");
    if (!roundsDisp) return;

    const cardsBeforeCut = Math.max(0, shoe.length - CUT_CARD_THRESHOLD);
    const estRounds = Math.max(1, Math.ceil(cardsBeforeCut / 6));

    if (pendingReshuffle || cardsBeforeCut === 0) {
      roundsDisp.textContent = "Next round (Cut Card reached)";
    } else {
      roundsDisp.textContent = `~${estRounds} rounds`;
    }
  }

  function updateBankrollDisplay() {
    const bankDisp = document.getElementById("bjBankrollVal");
    const netDisp = document.getElementById("bjNetProfitBadge");
    const rebuyBtn = document.getElementById("bjRebuyBtn");
    const customInp = document.getElementById("bjCustomBetInput");
    if (!bankDisp || !netDisp) return;

    bankDisp.textContent = bankroll;

    const totalInvested = 50 + totalRebuys * 50;
    const netProfit = bankroll - totalInvested;

    if (netProfit > 0) {
      netDisp.className = "net-profit-badge net-pos";
      netDisp.textContent = `Net Profit: +${netProfit} 🚀`;
    } else if (netProfit < 0) {
      netDisp.className = "net-profit-badge net-neg";
      netDisp.textContent = `Net: ${netProfit} 📉`;
    } else {
      netDisp.className = "net-profit-badge";
      netDisp.style.background = "var(--bg)";
      netDisp.style.border = "1px solid var(--border)";
      netDisp.style.color = "var(--muted)";
      netDisp.textContent = `Net: 0`;
    }

    if (rebuyBtn) {
      if (bankroll <= 0 && !inRound) {
        rebuyBtn.disabled = false;
        rebuyBtn.className = "rebuy-btn active-rebuy";
        rebuyBtn.textContent = "⚠️ Rebuy (+50)";
      } else {
        rebuyBtn.disabled = true;
        rebuyBtn.className = "rebuy-btn";
        rebuyBtn.textContent = "Rebuy (+50)";
      }
    }

    if (customInp && !inRound) {
      customInp.max = Math.max(1, bankroll);
      if (currentBet > bankroll && bankroll > 0) {
        currentBet = bankroll;
        customInp.value = currentBet;
      }
    }
  }

  function rebuyChips() {
    if (inRound) return;
    if (bankroll > 0) return;

    bankroll += 50;
    totalRebuys++;
    currentBet = Math.min(5, bankroll);
    const customInp = document.getElementById("bjCustomBetInput");
    if (customInp) customInp.value = currentBet;

    updateBankrollDisplay();
    setStatusMessage("Rebuy successful: Added +50 chips to bankroll.");
    updateButtonStates();
  }

  function setStatusMessage(msg, isHighlight = false) {
    const banner = document.getElementById("bjStatusBanner");
    if (!banner) return;
    banner.textContent = msg;
    banner.style.color = isHighlight ? "var(--gold)" : "rgba(255, 255, 255, 0.9)";
  }

  function renderCardFrontHtml(card) {
    return `
      <div class="bj-card-inner bj-card-front ${card.isRed ? "red-suit" : ""}">
        <div class="bj-card-top">
          <div class="bj-card-rank">${card.rank}</div>
          <div class="bj-card-suit">${card.suit}</div>
        </div>
        <div class="bj-card-center-suit">${card.suit}</div>
        <div class="bj-card-bottom">
          <div class="bj-card-rank">${card.rank}</div>
          <div class="bj-card-suit">${card.suit}</div>
        </div>
      </div>`;
  }

  function renderTable(lastDealtTarget = null) {
    const dealerRow = document.getElementById("bjDealerCards");
    const dealerScoreBadge = document.getElementById("bjDealerScore");
    if (dealerRow && dealerScoreBadge) {
      if (dealerCards.length === 0) {
        dealerRow.innerHTML = "";
        dealerScoreBadge.textContent = "-";
      } else {
        dealerRow.innerHTML = dealerCards
          .map((c, i) => {
            const isLastDealt = lastDealtTarget === `dealer-${i}`;
            const animClass = isLastDealt ? "new-deal" : "";

            if (i === 1 && dealerHoleHidden) {
              return `<div class="bj-card bj-card-back ${animClass}"></div>`;
            }

            const flipClass = i === 1 && holeJustRevealed ? "reveal-flip" : "";
            return `<div class="bj-card ${animClass} ${flipClass}">${renderCardFrontHtml(c)}</div>`;
          })
          .join("");

        if (dealerHoleHidden) {
          const visible = calculateScore([dealerCards[0]]);
          dealerScoreBadge.textContent = `${visible.score} + ?`;
        } else {
          const full = calculateScore(dealerCards);
          dealerScoreBadge.textContent = full.isBust ? `${full.score} (Bust!)` : `${full.score}`;
        }
      }
    }

    const playerArea = document.getElementById("bjPlayerArea");
    if (!playerArea) return;

    if (playerHands.length <= 1) {
      const hand = playerHands[0] || { cards: [], bet: currentBet };
      const score = calculateScore(hand.cards);
      playerArea.innerHTML = `
        <div class="bj-zone">
          <div class="zone-label">
            <span>Player</span>
            <span class="score-badge" id="bjPlayerScore">${hand.cards.length ? (score.isBust ? `${score.score} (Bust)` : score.score) : "-"}</span>
          </div>
          <div class="cards-hand-row" id="bjPlayerCards">
            ${hand.cards
              .map((c, i) => {
                const isLastDealt = lastDealtTarget === `player-0-${i}`;
                const animClass = isLastDealt ? "new-deal" : "";
                return `<div class="bj-card ${animClass}">${renderCardFrontHtml(c)}</div>`;
              })
              .join("")}
          </div>
        </div>`;
    } else {
      playerArea.innerHTML = `
        <div class="split-hands-wrapper">
          ${playerHands
            .map((h, idx) => {
              const sc = calculateScore(h.cards);
              const isCurrent = idx === currentHandIndex && inRound;
              return `
              <div class="split-hand-box ${isCurrent ? "current-hand" : ""}">
                <div class="zone-label">
                  <span>Hand ${idx + 1} (${h.bet}c)</span>
                  <span class="score-badge">${sc.isBust ? `${sc.score} (Bust)` : sc.score}</span>
                </div>
                <div class="cards-hand-row">
                  ${h.cards
                    .map((c, i) => {
                      const isLastDealt = lastDealtTarget === `player-${idx}-${i}`;
                      const animClass = isLastDealt ? "new-deal" : "";
                      return `<div class="bj-card ${animClass}">${renderCardFrontHtml(c)}</div>`;
                    })
                    .join("")}
                </div>
              </div>`;
            })
            .join("")}
        </div>`;
    }
  }

  function updateButtonStates() {
    const btnDeal = document.getElementById("bjBtnDeal");
    const btnHit = document.getElementById("bjBtnHit");
    const btnStand = document.getElementById("bjBtnStand");
    const btnDouble = document.getElementById("bjBtnDouble");
    const btnSplit = document.getElementById("bjBtnSplit");
    const btnSurrender = document.getElementById("bjBtnSurrender");
    const customInp = document.getElementById("bjCustomBetInput");

    if (!btnDeal) return;

    if (!inRound) {
      btnDeal.disabled = bankroll < currentBet || currentBet <= 0;
      btnHit.disabled = true;
      btnStand.disabled = true;
      btnDouble.disabled = true;
      btnSplit.disabled = true;
      btnSurrender.disabled = true;
      if (customInp) customInp.disabled = false;
      return;
    }

    if (customInp) customInp.disabled = true;
    btnDeal.disabled = true;
    btnHit.disabled = false;
    btnStand.disabled = false;

    const currentHand = playerHands[currentHandIndex];
    if (!currentHand) return;

    btnDouble.disabled = currentHand.cards.length !== 2 || bankroll < currentHand.bet;

    const canSplit =
      currentHand.cards.length === 2 &&
      currentHand.cards[0].rank === currentHand.cards[1].rank &&
      playerHands.length === 1 &&
      bankroll >= currentHand.bet;
    btnSplit.disabled = !canSplit;

    btnSurrender.disabled = currentHand.cards.length !== 2 || playerHands.length > 1;
  }

  function startRound() {
    if (inRound) return;

    const customInp = document.getElementById("bjCustomBetInput");
    if (customInp) {
      const val = parseInt(customInp.value, 10);
      if (!isNaN(val) && val > 0) currentBet = val;
    }

    if (currentBet > bankroll) {
      setStatusMessage("Bet exceeds current chip balance!");
      return;
    }

    if (bankroll <= 0) {
      setStatusMessage("Out of chips! Click ⚠️ Rebuy (+50) to continue.");
      return;
    }

    if (pendingReshuffle) {
      buildAndShuffleShoe();
      setStatusMessage("✂️ Cut Card reached — Shoe reshuffled!", true);
    }

    bankroll -= currentBet;
    updateBankrollDisplay();

    inRound = true;
    dealerHoleHidden = true;
    holeJustRevealed = false;
    playerHands = [{ cards: [], bet: currentBet, isDone: false, isBust: false, isBlackjack: false, isSurrender: false }];
    currentHandIndex = 0;
    dealerCards = [];

    setStatusMessage("Dealing cards...");
    updateButtonStates();

    setTimeout(() => {
      playerHands[0].cards.push(dealCard());
      renderTable("player-0-0");
      setTimeout(() => {
        dealerCards.push(dealCard());
        renderTable("dealer-0");
        setTimeout(() => {
          playerHands[0].cards.push(dealCard());
          renderTable("player-0-1");
          setTimeout(() => {
            dealerCards.push(dealCard());
            renderTable("dealer-1");
            checkInitialBlackjacks();
          }, DEAL_DELAY_MS);
        }, DEAL_DELAY_MS);
      }, DEAL_DELAY_MS);
    }, DEAL_DELAY_MS);
  }

  function checkInitialBlackjacks() {
    const playerScore = calculateScore(playerHands[0].cards);
    const dealerScore = calculateScore(dealerCards);

    const isPlayerBJ = playerScore.score === 21 && playerHands[0].cards.length === 2;
    const isDealerBJ = dealerScore.score === 21 && dealerCards.length === 2;

    if (isPlayerBJ || isDealerBJ) {
      dealerHoleHidden = false;
      holeJustRevealed = true;
      renderTable();

      sessionRounds++;
      if (isPlayerBJ && isDealerBJ) {
        bankroll += playerHands[0].bet;
        sessionPushes++;
        setStatusMessage("🤝 Both have Blackjack! Push (Bet returned).", true);
      } else if (isPlayerBJ) {
        const winAmount = playerHands[0].bet + Math.floor(playerHands[0].bet * 1.5);
        bankroll += winAmount;
        sessionWins++;
        sessionBlackjacks++;
        setStatusMessage(`🔥 Natural Blackjack! You win ${Math.floor(playerHands[0].bet * 1.5)} chips (3:2 payout)!`, true);
      } else {
        sessionLosses++;
        setStatusMessage("Dealer has Blackjack. House wins.", false);
      }

      recordRoundTrend();
      endRound();
    } else {
      setStatusMessage(`Your move! Hand total: ${playerScore.score}`);
      updateButtonStates();
    }
  }

  function actionHit() {
    if (!inRound) return;
    const hand = playerHands[currentHandIndex];
    if (!hand || hand.isDone) return;

    const newIdx = hand.cards.length;
    hand.cards.push(dealCard());
    renderTable(`player-${currentHandIndex}-${newIdx}`);

    const sc = calculateScore(hand.cards);
    if (sc.isBust) {
      hand.isBust = true;
      hand.isDone = true;
      advanceToNextHand();
    } else if (sc.score === 21) {
      hand.isDone = true;
      advanceToNextHand();
    } else {
      setStatusMessage(`Hand total: ${sc.score}. Hit or Stand?`);
      updateButtonStates();
    }
  }

  function actionStand() {
    if (!inRound) return;
    const hand = playerHands[currentHandIndex];
    if (!hand || hand.isDone) return;

    hand.isDone = true;
    advanceToNextHand();
  }

  function actionDouble() {
    if (!inRound) return;
    const hand = playerHands[currentHandIndex];
    if (!hand || hand.cards.length !== 2 || bankroll < hand.bet) return;

    bankroll -= hand.bet;
    hand.bet *= 2;
    updateBankrollDisplay();

    const newIdx = hand.cards.length;
    hand.cards.push(dealCard());
    const sc = calculateScore(hand.cards);
    if (sc.isBust) hand.isBust = true;
    hand.isDone = true;

    renderTable(`player-${currentHandIndex}-${newIdx}`);
    advanceToNextHand();
  }

  function actionSplit() {
    if (!inRound) return;
    const hand = playerHands[0];
    if (
      !hand ||
      hand.cards.length !== 2 ||
      hand.cards[0].rank !== hand.cards[1].rank ||
      playerHands.length > 1 ||
      bankroll < hand.bet
    )
      return;

    bankroll -= hand.bet;
    updateBankrollDisplay();

    const c1 = hand.cards[0];
    const c2 = hand.cards[1];

    playerHands = [
      { cards: [c1, dealCard()], bet: hand.bet, isDone: false, isBust: false, isBlackjack: false, isSurrender: false },
      { cards: [c2, dealCard()], bet: hand.bet, isDone: false, isBust: false, isBlackjack: false, isSurrender: false },
    ];
    currentHandIndex = 0;

    renderTable();
    setStatusMessage("Split hands! Playing Hand 1...");
    updateButtonStates();
  }

  function actionSurrender() {
    if (!inRound) return;
    const hand = playerHands[0];
    if (!hand || hand.cards.length !== 2 || playerHands.length > 1) return;

    const refund = Math.floor(hand.bet / 2);
    bankroll += refund;
    hand.isSurrender = true;
    hand.isDone = true;

    dealerHoleHidden = false;
    holeJustRevealed = true;
    renderTable();
    setStatusMessage(`🏳️ Surrendered. Recovered half bet (${refund} chips).`);

    sessionRounds++;
    sessionLosses++;
    recordRoundTrend();
    endRound();
  }

  function advanceToNextHand() {
    if (currentHandIndex + 1 < playerHands.length) {
      currentHandIndex++;
      renderTable();
      setStatusMessage(`Playing Hand ${currentHandIndex + 1}...`);
      updateButtonStates();
    } else {
      playDealerTurn();
    }
  }

  function playDealerTurn() {
    dealerHoleHidden = false;
    holeJustRevealed = true;
    renderTable();

    const allBustOrSurrender = playerHands.every((h) => h.isBust || h.isSurrender);
    if (allBustOrSurrender) {
      evaluateRoundResults();
      return;
    }

    function dealerDrawStep() {
      const dScore = calculateScore(dealerCards);
      if (dScore.score < 17) {
        setTimeout(() => {
          const newIdx = dealerCards.length;
          dealerCards.push(dealCard());
          renderTable(`dealer-${newIdx}`);
          dealerDrawStep();
        }, DEAL_DELAY_MS + 100);
      } else {
        setTimeout(evaluateRoundResults, 200);
      }
    }

    dealerDrawStep();
  }

  function evaluateRoundResults() {
    const dScore = calculateScore(dealerCards);
    let netDeltaThisRound = 0;
    const results = [];

    sessionRounds++;

    playerHands.forEach((h, idx) => {
      if (h.isSurrender) {
        results.push(`Hand ${idx + 1}: Surrendered`);
        sessionLosses++;
        return;
      }
      if (h.isBust) {
        results.push(`Hand ${idx + 1}: Bust (-${h.bet})`);
        sessionLosses++;
        return;
      }

      const pScore = calculateScore(h.cards);
      if (dScore.isBust) {
        bankroll += h.bet * 2;
        netDeltaThisRound += h.bet;
        sessionWins++;
        results.push(`Hand ${idx + 1}: Win! Dealer Bust (+${h.bet})`);
      } else if (pScore.score > dScore.score) {
        bankroll += h.bet * 2;
        netDeltaThisRound += h.bet;
        sessionWins++;
        results.push(`Hand ${idx + 1}: Win (+${h.bet})`);
      } else if (pScore.score < dScore.score) {
        sessionLosses++;
        results.push(`Hand ${idx + 1}: Loss (-${h.bet})`);
      } else {
        bankroll += h.bet;
        sessionPushes++;
        results.push(`Hand ${idx + 1}: Push (Tie)`);
      }
    });

    renderTable();
    updateBankrollDisplay();
    recordRoundTrend();

    const summary = results.join(" | ");
    if (netDeltaThisRound > 0) {
      setStatusMessage(`🎉 ${summary}`, true);
    } else {
      setStatusMessage(summary);
    }

    endRound();
  }

  function recordRoundTrend() {
    trendLabels.push(`R${sessionRounds}`);
    trendBankroll.push(bankroll);
    updateSessionCharts();
  }

  function endRound() {
    inRound = false;
    updateBankrollDisplay();
    updateButtonStates();

    if (bankroll <= 0) {
      setTimeout(() => {
        setStatusMessage("Out of chips! Click ⚠️ Rebuy (+50) to continue.", true);
      }, 500);
    }
  }

  function adjustBet(delta, isAbsolute = false) {
    if (inRound) return;
    const customInp = document.getElementById("bjCustomBetInput");
    if (!customInp) return;

    if (isAbsolute) {
      currentBet = delta;
    } else {
      currentBet += delta;
    }

    if (currentBet > bankroll && bankroll > 0) currentBet = bankroll;
    if (currentBet < 1) currentBet = 1;

    customInp.value = currentBet;
    updateButtonStates();
  }

  // Session Stats Chart.js Rendering
  function updateSessionCharts() {
    const statWinrate = document.getElementById("bjStatWinrate");
    const statRounds = document.getElementById("bjStatRounds");
    const statWLD = document.getElementById("bjStatWLD");

    const totalDecisions = sessionWins + sessionLosses;
    const winRatePct = totalDecisions > 0 ? ((sessionWins / totalDecisions) * 100).toFixed(1) : "0.0";

    if (statWinrate) statWinrate.textContent = `Winrate: ${winRatePct}%`;
    if (statRounds) statRounds.textContent = `Rounds: ${sessionRounds}`;
    if (statWLD) statWLD.textContent = `W: ${sessionWins} | L: ${sessionLosses} | P: ${sessionPushes}`;

    if (typeof Chart === "undefined") return;

    // 1. Donut Chart
    const donutCtx = document.getElementById("bjDonutCanvas");
    if (donutCtx) {
      const dataVals = [sessionWins, sessionLosses, sessionPushes];
      const hasData = sessionWins + sessionLosses + sessionPushes > 0;

      if (!donutChart) {
        donutChart = new Chart(donutCtx, {
          type: "doughnut",
          data: {
            labels: ["Wins", "Losses", "Pushes"],
            datasets: [
              {
                data: hasData ? dataVals : [1, 1, 1],
                backgroundColor: hasData
                  ? ["#30d158", "#ff453a", "#8e8e93"]
                  : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: "#8e8e93", font: { size: 10 }, boxWidth: 10 },
              },
            },
          },
        });
      } else {
        donutChart.data.datasets[0].data = hasData ? dataVals : [1, 1, 1];
        donutChart.data.datasets[0].backgroundColor = hasData
          ? ["#30d158", "#ff453a", "#8e8e93"]
          : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)"];
        donutChart.update();
      }
    }

    // 2. Trend Line Chart
    const trendCtx = document.getElementById("bjTrendCanvas");
    if (trendCtx) {
      const isProfitable = bankroll >= 50;
      const lineColor = isProfitable ? "#30d158" : "#ff453a";
      const bgColor = isProfitable ? "rgba(48, 209, 88, 0.12)" : "rgba(255, 69, 58, 0.12)";

      if (!trendLineChart) {
        trendLineChart = new Chart(trendCtx, {
          type: "line",
          data: {
            labels: trendLabels,
            datasets: [
              {
                label: "Chip Balance",
                data: trendBankroll,
                borderColor: lineColor,
                backgroundColor: bgColor,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: "#8e8e93", font: { size: 9 } },
              },
              y: {
                grid: { color: "rgba(255,255,255,0.06)" },
                ticks: { color: "#8e8e93", font: { size: 9 } },
              },
            },
          },
        });
      } else {
        trendLineChart.data.labels = trendLabels;
        trendLineChart.data.datasets[0].data = trendBankroll;
        trendLineChart.data.datasets[0].borderColor = lineColor;
        trendLineChart.data.datasets[0].backgroundColor = bgColor;
        trendLineChart.update();
      }
    }
  }

  function initBlackjackTrainer() {
    buildAndShuffleShoe();
    updateBankrollDisplay();
    updateShuffleIndicator();
    renderTable();

    const btnDeal = document.getElementById("bjBtnDeal");
    const btnHit = document.getElementById("bjBtnHit");
    const btnStand = document.getElementById("bjBtnStand");
    const btnDouble = document.getElementById("bjBtnDouble");
    const btnSplit = document.getElementById("bjBtnSplit");
    const btnSurrender = document.getElementById("bjBtnSurrender");
    const btnRebuy = document.getElementById("bjRebuyBtn");

    if (btnDeal) btnDeal.addEventListener("click", startRound);
    if (btnHit) btnHit.addEventListener("click", actionHit);
    if (btnStand) btnStand.addEventListener("click", actionStand);
    if (btnDouble) btnDouble.addEventListener("click", actionDouble);
    if (btnSplit) btnSplit.addEventListener("click", actionSplit);
    if (btnSurrender) btnSurrender.addEventListener("click", actionSurrender);
    if (btnRebuy) btnRebuy.addEventListener("click", rebuyChips);

    // Custom bet input handler
    const customInp = document.getElementById("bjCustomBetInput");
    if (customInp) {
      customInp.value = currentBet;
      customInp.addEventListener("input", () => {
        if (inRound) return;
        const val = parseInt(customInp.value, 10);
        if (!isNaN(val)) {
          currentBet = Math.min(Math.max(1, val), bankroll > 0 ? bankroll : 1);
        }
        updateButtonStates();
      });
    }

    // Template Bet Preset buttons (e.g. 5, 10, 25, 50)
    const presetBtns = document.querySelectorAll(".bet-preset-btn");
    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseInt(btn.dataset.preset, 10);
        adjustBet(val, true);
      });
    });

    // Quick add chips
    const chipBtns = document.querySelectorAll(".bet-chip");
    chipBtns.forEach((ch) => {
      ch.addEventListener("click", () => {
        const val = parseInt(ch.dataset.val, 10);
        adjustBet(val, false);
      });
    });

    // Max & Min buttons
    const btnMax = document.getElementById("bjBetMaxBtn");
    const btnClear = document.getElementById("bjBetClearBtn");
    if (btnMax) {
      btnMax.addEventListener("click", () => {
        adjustBet(bankroll > 0 ? bankroll : 1, true);
      });
    }
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        adjustBet(1, true);
      });
    }

    // Stats Panel Toggle Button
    const statsToggleBtn = document.getElementById("bjStatsToggleBtn");
    const statsPanel = document.getElementById("bjStatsPanel");
    if (statsToggleBtn && statsPanel) {
      statsToggleBtn.addEventListener("click", () => {
        isStatsPanelOpen = !isStatsPanelOpen;
        statsPanel.classList.toggle("hidden", !isStatsPanelOpen);
        statsToggleBtn.classList.toggle("active", isStatsPanelOpen);
        if (isStatsPanelOpen) {
          setTimeout(updateSessionCharts, 100);
        }
      });
    }

    updateButtonStates();
    updateSessionCharts();
  }

  window.initBlackjackTrainer = initBlackjackTrainer;
})();
