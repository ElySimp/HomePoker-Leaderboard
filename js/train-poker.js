// Poker Range Lab: GTO Mixed-Strategy Split Matrix, Dynamic Postflop Solver & Tactical Advisor

(function () {
  const E = window.PokerEvaluator;
  if (!E) {
    return;
  }

  const { RANKS, RANK_VALUES, SUITS, NICKNAMES, EQUITY_MAP } = E;

  // Lab State
  let currentPosition = "BTN";
  let selectedHand = "AKs";
  let activeOpponents = 1;
  let tableSize = 6;

  let boardCards = [null, null, null, null, null];
  let heroCards = [null, null];
  let activeSlotTarget = null;

  let pickedRank = null;
  let pickedSuit = null;

  function getHandNotation(row, col) {
    const r1 = RANKS[row];
    const r2 = RANKS[col];
    if (row === col) return `${r1}${r2}`;
    if (row < col) return `${r1}${r2}s`;
    return `${r2}${r1}o`;
  }

  function getHeroHandNotation() {
    const h1 = heroCards[0];
    const h2 = heroCards[1];
    if (!h1 || !h2) return null;
    const v1 = RANK_VALUES[h1.rank];
    const v2 = RANK_VALUES[h2.rank];
    if (h1.rank === h2.rank) return `${h1.rank}${h2.rank}`;
    const isSuited = h1.suit === h2.suit;
    const high = v1 >= v2 ? h1.rank : h2.rank;
    const low = v1 >= v2 ? h2.rank : h1.rank;
    return `${high}${low}${isSuited ? "s" : "o"}`;
  }

  function clearSingleSlot(slotTarget) {
    if (!slotTarget) return;
    if (slotTarget.startsWith("board")) {
      const idx = parseInt(slotTarget.replace("board", ""), 10);
      boardCards[idx] = null;
    } else if (slotTarget.startsWith("hero")) {
      const idx = parseInt(slotTarget.replace("hero", ""), 10);
      heroCards[idx] = null;
    }
    renderSlots();
  }

  function isHandDead(hand) {
    const allPicked = [...boardCards, ...heroCards].filter(Boolean);
    if (!allPicked.length) return false;

    const r1 = hand[0];
    const r2 = hand[1];
    const isPair = r1 === r2;
    const isSuited = hand.endsWith("s");
    const isOffsuit = hand.endsWith("o");

    const r1Count = allPicked.filter((c) => c.rank === r1).length;
    const r2Count = allPicked.filter((c) => c.rank === r2).length;

    if (isPair) return r1Count >= 3;
    if (isSuited) {
      const suitsTaken = SUITS.map((s) => {
        const has1 = allPicked.some((c) => c.rank === r1 && c.suit === s.symbol);
        const has2 = allPicked.some((c) => c.rank === r2 && c.suit === s.symbol);
        return has1 || has2;
      });
      return suitsTaken.every(Boolean);
    }
    if (isOffsuit) return r1Count === 4 || r2Count === 4;
    return false;
  }

  // Preflop GTO Action Frequencies (Position based)
  function getPreflopFrequencies(hand) {
    const pos = currentPosition;
    const baseEquity = EQUITY_MAP[hand] !== undefined ? EQUITY_MAP[hand] : 50.0;

    // Pure monsters
    if (hand === "AA" || hand === "KK") {
      return {
        raise: 100, call: 0, fold: 0,
        primaryAction: "3bet",
        actionTitle: "100% Raise / 3-Bet",
        advice: "Pure monster. Always open-raise 2.5x BB or 3-Bet / 4-Bet for maximum value from any position.",
      };
    }

    // Tier 1 broadway & high pairs
    if (["QQ", "JJ", "AKs"].includes(hand)) {
      return {
        raise: 90, call: 10, fold: 0,
        primaryAction: "3bet",
        actionTitle: "Raise 90% | Call 10%",
        advice: "Premium holding. Standard line is to open-raise or 3-Bet. Occasional flat call to balance range.",
      };
    }

    if (["TT", "99", "AQs", "AJs", "KQs", "AKo"].includes(hand)) {
      const raisePct = pos === "UTG" ? 75 : 85;
      return {
        raise: raisePct, call: 100 - raisePct, fold: 0,
        primaryAction: "raise",
        actionTitle: `Raise ${raisePct}% | Call ${100 - raisePct}%`,
        advice: `Strong holding. Solid open-raise from ${pos}; flat call or 3-bet versus early position openers.`,
      };
    }

    // Medium pairs & Suited Connectors
    if (["88", "77", "ATs", "KJs", "QJs", "JTs", "AQo"].includes(hand)) {
      if (pos === "UTG") {
        return {
          raise: 50, call: 40, fold: 10,
          primaryAction: "call",
          actionTitle: "Raise 50% | Call 40% | Fold 10%",
          advice: "Marginal from early position. Mix between small open-raise and flat calling; fold against tight 3-bets.",
        };
      }
      return {
        raise: 70, call: 30, fold: 0,
        primaryAction: "raise",
        actionTitle: "Raise 70% | Call 30%",
        advice: `Playable holding from ${pos}. Open-raise with initiative; great postflop implied odds.`,
      };
    }

    // Speculative suited connectors & small pairs
    if (["66", "55", "44", "33", "22", "98s", "87s", "76s", "65s", "54s", "A5s", "A4s"].includes(hand)) {
      if (pos === "UTG") {
        return {
          raise: 20, call: 30, fold: 50,
          primaryAction: "fold",
          actionTitle: "Fold 50% | Call 30% | Raise 20%",
          advice: "Tight early position holding. Fold most combos; occasional raise as balance or set-mine if deep stacked.",
        };
      }
      return {
        raise: 55, call: 35, fold: 10,
        primaryAction: "call",
        actionTitle: "Raise 55% | Call 35% | Fold 10%",
        advice: `Excellent speculative hand from ${pos}. Open-raise to steal blinds, or flat call to hit disguised sets/straights.`,
      };
    }

    // Marginal broadways
    if (["KQo", "KJo", "QJo", "JTo", "ATo", "K9s", "Q9s", "J9s", "T8s"].includes(hand)) {
      if (pos === "UTG" || pos === "MP") {
        return {
          raise: 10, call: 20, fold: 70,
          primaryAction: "fold",
          actionTitle: "Fold 70% | Call 20% | Raise 10%",
          advice: "Dominated easily by early position raisers. Best folded preflop to prevent chip leakage.",
        };
      }
      return {
        raise: 45, call: 35, fold: 20,
        primaryAction: "call",
        actionTitle: "Raise 45% | Call 35% | Fold 20%",
        advice: `Playable from late position (${pos}). Open-raise against passive blinds.`,
      };
    }

    // Trash / Bottom Range
    if (baseEquity < 40) {
      return {
        raise: 0, call: 0, fold: 100,
        primaryAction: "fold",
        actionTitle: "100% Fold",
        advice: "Unplayable starting hand. Fold preflop to conserve bankroll.",
      };
    }

    // Default middle range
    const defRaise = pos === "BTN" ? 35 : pos === "CO" ? 25 : 10;
    const defCall = pos === "BTN" ? 35 : 20;
    const defFold = 100 - defRaise - defCall;
    const primaryDef = defRaise >= 35 ? "raise" : defCall >= 30 ? "call" : "fold";
    return {
      raise: defRaise,
      call: defCall,
      fold: defFold,
      primaryAction: primaryDef,
      actionTitle: `Fold ${defFold}% | Call ${defCall}% | Raise ${defRaise}%`,
      advice: `Borderline holding in ${pos}. Favorable to fold; only play as late position steal attempt.`,
    };
  }

  // Action Resolver: dynamically determines Preflop or Postflop action
  function getGTOFrequencies(hand) {
    const validBoard = boardCards.filter(Boolean);
    if (validBoard.length >= 3) {
      return E.evaluateHandOnBoard(hand, validBoard);
    }
    return getPreflopFrequencies(hand);
  }

  // --- Render 13x13 Grid (Dynamic Postflop Adaptability) ---
  function renderGrid() {
    const grid = document.getElementById("pokerGrid");
    const modeTag = document.getElementById("matrixModeTag");
    if (!grid) return;
    grid.innerHTML = "";

    const validBoard = boardCards.filter(Boolean);
    const isPostflop = validBoard.length >= 3;

    if (modeTag) {
      if (isPostflop) {
        modeTag.textContent = `${validBoard.length}-Card Board Active`;
        modeTag.classList.add("postflop-active");
      } else {
        modeTag.textContent = `Preflop ${currentPosition}`;
        modeTag.classList.remove("postflop-active");
      }
    }

    // Update legend labels dynamically
    const legendEl = document.getElementById("pokerActionLegend");
    if (legendEl) {
      if (isPostflop) {
        legendEl.innerHTML = `
          <span><span class="legend-dot dot-3bet"></span>Monster / Value Bet</span>
          <span><span class="legend-dot dot-raise"></span>Bet / Semi-Bluff</span>
          <span><span class="legend-dot dot-call"></span>Call / Check</span>
          <span><span class="legend-dot dot-soft"></span>Mixed / Marginal</span>
          <span><span class="legend-dot dot-fold"></span>Fold to Bet</span>`;
      } else {
        legendEl.innerHTML = `
          <span><span class="legend-dot dot-3bet"></span>3-Bet</span>
          <span><span class="legend-dot dot-raise"></span>Open-Raise / Bet</span>
          <span><span class="legend-dot dot-call"></span>Call / Check</span>
          <span><span class="legend-dot dot-soft"></span>Mixed / Marginal</span>
          <span><span class="legend-dot dot-fold"></span>Fold</span>`;
      }
    }

    const heroHand = getHeroHandNotation();

    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const hand = getHandNotation(r, c);
        const dead = isHandDead(hand);
        const freqs = getGTOFrequencies(hand);
        const isHero = hand === heroHand;

        let actionClass = "act-fold";
        let inlineStyle = "";

        if (freqs.fold < 50) {
          actionClass = freqs.primaryAction ? `act-${freqs.primaryAction}` : "act-fold";
        } else if (freqs.call > 0 || freqs.raise > 0) {
          // Mixed / Marginal holding: modulate opacity according to whichever is higher between call and raise
          if (freqs.call >= freqs.raise) {
            actionClass = "act-call-soft";
            const alphaBg = (0.05 + (freqs.call / 100) * 0.16).toFixed(3);
            const alphaBorder = (0.12 + (freqs.call / 100) * 0.28).toFixed(3);
            const alphaText = (0.45 + (freqs.call / 100) * 0.55).toFixed(3);
            inlineStyle = `background: rgba(255, 214, 10, ${alphaBg}); border-color: rgba(255, 214, 10, ${alphaBorder}); color: rgba(255, 244, 163, ${alphaText});`;
          } else {
            actionClass = "act-raise-soft";
            const alphaBg = (0.05 + (freqs.raise / 100) * 0.16).toFixed(3);
            const alphaBorder = (0.12 + (freqs.raise / 100) * 0.28).toFixed(3);
            const alphaText = (0.45 + (freqs.raise / 100) * 0.55).toFixed(3);
            inlineStyle = `background: rgba(48, 209, 88, ${alphaBg}); border-color: rgba(48, 209, 88, ${alphaBorder}); color: rgba(158, 252, 192, ${alphaText});`;
          }
        } else {
          actionClass = "act-fold";
        }

        const cell = document.createElement("div");
        cell.className = `hand-cell ${actionClass} ${dead ? "dead-hand" : ""} ${hand === selectedHand ? "active-hand" : ""} ${isHero ? "hero-hand-cell" : ""}`;
        if (inlineStyle) {
          cell.style.cssText = inlineStyle;
        }
        cell.textContent = hand;
        cell.dataset.hand = hand;

        cell.title = isHero
          ? `Your Hand: ${hand} (${freqs.actionTitle})`
          : `${hand} • ${freqs.actionTitle}`;

        cell.addEventListener("click", () => {
          selectedHand = hand;
          renderGrid();
          updateInspector(hand);
        });

        grid.appendChild(cell);
      }
    }
  }

  // --- Hand Inspector (Below 13x13 Grid) ---
  function updateInspector(hand) {
    const badge = document.getElementById("inspHandBadge");
    const nick = document.getElementById("inspHandNick");
    const eqVal = document.getElementById("inspEquityVal");
    const actVal = document.getElementById("inspActionVal");
    const advice = document.getElementById("inspAdvice");
    if (!badge) return;

    badge.textContent = hand;
    nick.textContent = NICKNAMES[hand] || (hand.endsWith("s") ? "Suited Hand" : hand.endsWith("o") ? "Offsuit Hand" : "Pocket Pair");

    const validBoard = boardCards.filter(Boolean);
    const isPostflop = validBoard.length >= 3;

    if (isPostflop) {
      // Evaluate inspector hand on this specific board
      const r1 = hand[0];
      const r2 = hand[1];
      const isSuited = hand.endsWith("s");
      const sampleCombo = isSuited
        ? [{ rank: r1, suit: "♠" }, { rank: r2, suit: "♠" }]
        : [{ rank: r1, suit: "♠" }, { rank: r2, suit: "♥" }];

      const score = E.evaluateHandRank([...validBoard, ...sampleCombo]);
      const eqResult = E.calculateHeroEquity(sampleCombo, validBoard, activeOpponents);
      eqVal.innerHTML = `${eqResult.heroWin.toFixed(1)}% <span style="font-size:10px;color:var(--muted);font-weight:normal">(vs ${activeOpponents} ${activeOpponents === 1 ? "opp" : "opps"} • ${score[6]})</span>`;
    } else {
      const isPair = hand.length === 2 && hand[0] === hand[1];
      const isSuited = hand.endsWith("s");
      const baseEquity = EQUITY_MAP[hand] !== undefined ? EQUITY_MAP[hand] : 50.0;
      const p = baseEquity / 100;
      const decayCoeff = isPair ? 0.94 : isSuited ? 0.92 : 1.0;
      const multiEquity = (p / (p + activeOpponents * (1 - p) * decayCoeff)) * 100;
      eqVal.innerHTML = `${multiEquity.toFixed(1)}% <span style="font-size:10px;color:var(--muted);font-weight:normal">(vs ${activeOpponents} ${activeOpponents === 1 ? "opp" : "opps"})</span>`;
    }

    const freqs = getGTOFrequencies(hand);

    const is3Bet = freqs.primaryAction === "3bet";
    const raiseBarClass = is3Bet ? "gto-bar-3bet" : "gto-bar-raise";
    const raiseLblClass = is3Bet ? "lbl-3bet" : "lbl-raise";
    const raiseLabel = is3Bet ? (isPostflop ? "Value Bet / Trap" : "3-Bet") : (isPostflop ? "Bet / Semi-Bluff" : "Raise/Bet");

    const barHtml = `
      <div class="gto-freq-bar-container">
        <div class="${raiseBarClass}" style="width:${freqs.raise}%"></div>
        <div class="gto-bar-call" style="width:${freqs.call}%"></div>
        <div class="gto-bar-fold" style="width:${freqs.fold}%"></div>
      </div>
      <div class="gto-freq-labels">
        <span class="${raiseLblClass}">${raiseLabel}: ${freqs.raise}%</span>
        <span class="lbl-call">Call/Check: ${freqs.call}%</span>
        <span class="lbl-fold">Fold: ${freqs.fold}%</span>
      </div>`;

    actVal.innerHTML = `<div>${freqs.actionTitle}</div>${barHtml}`;
    advice.innerHTML = `<b>Strategic Advice:</b> ${freqs.advice}`;
  }

  // --- Postflop Tactical Advisor & Hero Live Equity ---
  function evaluatePostflop() {
    const madeBadge = document.getElementById("postflopMadeBadge");
    const recBadge = document.getElementById("postflopRecBadge");
    const reasoningBox = document.getElementById("postflopReasoning");

    // Hero Live Equity Elements
    const heroEqVal = document.getElementById("heroLiveEquityVal");
    const heroOppsVal = document.getElementById("heroLiveOppsVal");
    const heroOutsBadge = document.getElementById("heroLiveOutsBadge");
    const heroEqBar = document.getElementById("heroLiveEqBar");
    const heroTieBar = document.getElementById("heroLiveTieBar");
    const heroOppBar = document.getElementById("heroLiveOppBar");

    // Bluff Radar Elements
    const heroBluffNum = document.getElementById("heroBluffNum");
    const heroBluffBar = document.getElementById("heroBluffBar");
    const oppBluffNum = document.getElementById("oppBluffNum");
    const oppBluffBar = document.getElementById("oppBluffBar");

    if (!madeBadge || !recBadge || !reasoningBox) return;

    const validBoard = boardCards.filter(Boolean);
    const validHero = heroCards.filter(Boolean);

    if (heroOppsVal) {
      heroOppsVal.textContent = `(vs ${activeOpponents} ${activeOpponents === 1 ? "opp" : "opps"})`;
    }

    // Calculate Hero Equity if 2 cards picked
    if (validHero.length === 2) {
      const eq = E.calculateHeroEquity(validHero, validBoard, activeOpponents);
      if (heroEqVal) heroEqVal.textContent = `${eq.heroWin.toFixed(1)}%`;
      if (heroEqBar) heroEqBar.style.width = `${eq.heroWin}%`;
      if (heroTieBar) heroTieBar.style.width = `${eq.tie}%`;
      if (heroOppBar) heroOppBar.style.width = `${eq.oppWin}%`;
    } else {
      if (heroEqVal) heroEqVal.textContent = "--%";
      if (heroEqBar) heroEqBar.style.width = "50%";
      if (heroTieBar) heroTieBar.style.width = "0%";
      if (heroOppBar) heroOppBar.style.width = "50%";
    }

    // Update Bluff Radar
    const bluff = E.calculateBluffMetrics(validHero, validBoard, activeOpponents);
    if (bluff.isAvailable) {
      if (heroBluffNum) heroBluffNum.textContent = `${bluff.heroFoldEquity}%`;
      if (heroBluffBar) heroBluffBar.style.width = `${bluff.heroFoldEquity}%`;
      if (oppBluffNum) oppBluffNum.textContent = `${bluff.oppBluffLikelihood}%`;
      if (oppBluffBar) oppBluffBar.style.width = `${bluff.oppBluffLikelihood}%`;
    } else {
      if (heroBluffNum) heroBluffNum.textContent = "--%";
      if (heroBluffBar) heroBluffBar.style.width = "0%";
      if (oppBluffNum) oppBluffNum.textContent = "--%";
      if (oppBluffBar) oppBluffBar.style.width = "0%";
    }

    // Check Board State
    if (validBoard.length < 3) {
      madeBadge.textContent = "Awaiting Flop Cards";
      recBadge.className = "action-rec-badge rec-waiting";
      recBadge.textContent = "Preflop Mode";
      if (heroOutsBadge) {
        heroOutsBadge.textContent = validHero.length === 2 ? "Preflop Hand" : "-- Outs";
        heroOutsBadge.className = "hero-outs-badge empty";
      }
      reasoningBox.innerHTML = `Select at least <b>3 Flop cards</b> in the board slots above to analyze postflop hand strength, draws, and recommended moves.`;
      return;
    }

    if (validHero.length < 2) {
      madeBadge.textContent = `${validBoard.length}-Card Board Analyzed`;
      recBadge.className = "action-rec-badge rec-waiting";
      recBadge.textContent = "Pick Hero Cards";
      if (heroOutsBadge) {
        heroOutsBadge.textContent = "-- Outs";
        heroOutsBadge.className = "hero-outs-badge empty";
      }
      reasoningBox.innerHTML = `Select your <b>2 Hero Cards</b> above to calculate your exact hand strength, outs, and live winning chance.`;
      return;
    }

    // Both Board (>=3) and Hero (2) cards are present
    const allCards = [...validBoard, ...validHero];
    const score = E.evaluateHandRank(allCards);
    const cat = score[0];
    const handName = score[6];

    const boardValues = validBoard.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const heroValues = validHero.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const highestBoard = boardValues[0];

    const draws = E.detectDrawsAndOuts(validHero, validBoard);

    // Update Outs Badge
    if (heroOutsBadge) {
      if (draws.outs > 0) {
        heroOutsBadge.textContent = `🎯 ${draws.outs} Outs (${draws.name} • ~${draws.equityPct}%)`;
        heroOutsBadge.className = "hero-outs-badge";
      } else {
        heroOutsBadge.textContent = `👑 Made: ${handName}`;
        heroOutsBadge.className = "hero-outs-badge empty";
      }
    }

    let moveRec = "Check / Fold";
    let recClass = "rec-check-fold";
    let reasoning = "";
    let displayBadgeText = handName;

    // Tactical moves prioritizing Monster hands and Monster Draws
    if (cat >= 4) {
      moveRec = "🔥 Value Bet / Raise (66% - 75% Pot)";
      recClass = "rec-value-bet";
      reasoning = `Monster hand (${handName}). Bet or raise generously for maximum value against flushes, straights, and sets.`;
    } else if (cat === 3) {
      moveRec = "🔥 Value Bet (50% - 66% Pot)";
      recClass = "rec-value-bet";
      reasoning = `Three of a Kind (${handName}). Fast-play to build the pot and charge drawing opponents.`;
    } else if (draws.isMonster || draws.outs >= 12) {
      displayBadgeText = `Monster Draw (${draws.outs} Outs)`;
      moveRec = "🔥 Semi-Bluff Raise / Max Aggression";
      recClass = "rec-semi-bluff";
      reasoning = `Monster Combo Draw (${draws.name}) with ${draws.outs} outs (~${draws.equityPct}% draw equity)! High semi-bluff equity. Bet or raise aggressively to capture fold equity or build a massive pot.`;
    } else if (cat === 2) {
      moveRec = "✅ Bet / Protect (40% - 60% Pot)";
      recClass = "rec-value-bet";
      reasoning = `Two Pair (${handName}). Ahead of single pairs. Bet for value on dry boards; proceed with pot control on heavy draw boards.`;
    } else if (draws.outs >= 8) {
      displayBadgeText = `Draw: ${draws.name}`;
      moveRec = `✅ Semi-Bluff Bet / Call (${draws.outs} Outs)`;
      recClass = "rec-semi-bluff";
      reasoning = `High-equity drawing holding with ${draws.outs} outs (~${draws.equityPct}% equity). Strong candidate to semi-bluff bet to fold out weak pairs, or flat call with great implied odds.`;
    } else if (cat === 1) {
      const heroIsPair = validHero[0].rank === validHero[1].rank;
      if (heroIsPair && heroValues[0] > highestBoard) {
        moveRec = "✅ Bet / C-Bet (40% - 55% Pot)";
        recClass = "rec-value-bet";
        reasoning = `Pocket overpair beats all single board pairs. Continuation bet for value and protection.`;
      } else if (validHero.some((h) => RANK_VALUES[h.rank] === highestBoard)) {
        if (draws.outs >= 4) {
          moveRec = "✅ Value Bet / Draw (40% - 50% Pot)";
          recClass = "rec-value-bet";
          reasoning = `Top pair accompanied by ${draws.name} (${draws.outs} outs). Excellent hand to bet for value and protection.`;
        } else {
          moveRec = "✅ Bet / C-Bet (33% - 50% Pot)";
          recClass = "rec-value-bet";
          reasoning = `Top pair with solid kicker. Bet for value against middle pairs, or call reasonable bets.`;
        }
      } else {
        if (draws.outs >= 4) {
          moveRec = "🔷 Check-Call / Draw";
          recClass = "rec-check-call";
          reasoning = `Middle pair with ${draws.name} (${draws.outs} outs). Check-call to see next street cheaply.`;
        } else {
          moveRec = "🔷 Check-Call / Pot Control";
          recClass = "rec-check-call";
          reasoning = `Middle or bottom pair with weak showdown value. Check to keep pot small; fold to multi-street aggression.`;
        }
      }
    } else if (draws.outs >= 4) {
      displayBadgeText = `Draw (${draws.outs} Outs)`;
      moveRec = "🔷 Check / Float with Odds";
      recClass = "rec-check-call";
      reasoning = `${draws.name} with ${draws.outs} outs (~${draws.equityPct}% equity). Check to see cheap cards; only call small continuation bets if pot odds allow.`;
    } else {
      moveRec = "❌ Check / Fold";
      recClass = "rec-check-fold";
      reasoning = "Unimproved holding with minimal equity on this board texture. Disciplined check-fold.";
    }

    madeBadge.textContent = displayBadgeText;
    recBadge.className = `action-rec-badge ${recClass}`;
    recBadge.textContent = moveRec;
    reasoningBox.innerHTML = `<b>Tactical Recommendation:</b> ${reasoning}`;
  }

  // --- Render Board & Hero Slots ---
  function renderSlots() {
    for (let i = 0; i < 5; i++) {
      const slot = document.getElementById(`boardSlot${i}`);
      if (!slot) continue;
      const c = boardCards[i];
      if (c) {
        slot.className = `card-slot filled ${c.cssClass || ""}`;
        slot.innerHTML = `
          <span class="slot-rank">${c.rank}</span>
          <span class="slot-suit">${c.suit}</span>
          <button class="slot-remove-btn" title="Remove this card" data-slot="board${i}">✕</button>
        `;
      } else {
        const labels = ["Flop 1", "Flop 2", "Flop 3", "Turn", "River"];
        slot.className = "card-slot";
        slot.innerHTML = `<span style="font-size:10px;color:var(--muted)">${labels[i]}</span>`;
      }
    }

    for (let i = 0; i < 2; i++) {
      const slot = document.getElementById(`heroSlot${i}`);
      if (!slot) continue;
      const c = heroCards[i];
      if (c) {
        slot.className = `card-slot filled ${c.cssClass || ""}`;
        slot.innerHTML = `
          <span class="slot-rank">${c.rank}</span>
          <span class="slot-suit">${c.suit}</span>
          <button class="slot-remove-btn" title="Remove this card" data-slot="hero${i}">✕</button>
        `;
      } else {
        slot.className = "card-slot";
        slot.innerHTML = `<span style="font-size:10px;color:var(--muted)">Card ${i + 1}</span>`;
      }
    }

    // Attach listeners to slot remove buttons
    document.querySelectorAll(".slot-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearSingleSlot(btn.dataset.slot);
      });
    });

    evaluatePostflop();
    renderGrid();
    updateInspector(selectedHand);
  }

  function openQuickPicker(target) {
    activeSlotTarget = target;
    pickedRank = null;
    pickedSuit = null;

    const modal = document.getElementById("quickCardPicker");
    const tagEl = document.getElementById("quickPickerTargetTag");
    const removeBtn = document.getElementById("quickPickerRemove");
    if (!modal) return;

    if (target.startsWith("board")) {
      const idx = parseInt(target.replace("board", ""), 10);
      const labels = ["Flop 1", "Flop 2", "Flop 3", "Turn", "River"];
      if (tagEl) tagEl.textContent = labels[idx];
      if (removeBtn) removeBtn.classList.toggle("hidden", !boardCards[idx]);
    } else if (target.startsWith("hero")) {
      const idx = parseInt(target.replace("hero", ""), 10);
      if (tagEl) tagEl.textContent = `Hero Card ${idx + 1}`;
      if (removeBtn) removeBtn.classList.toggle("hidden", !heroCards[idx]);
    }

    modal.classList.remove("hidden");

    modal.querySelectorAll(".p-rank-btn").forEach((b) => b.classList.remove("selected"));
    modal.querySelectorAll(".p-suit-btn").forEach((b) => b.classList.remove("selected"));
  }

  function closeQuickPicker() {
    const modal = document.getElementById("quickCardPicker");
    if (modal) modal.classList.add("hidden");
    activeSlotTarget = null;
  }

  function confirmQuickPick() {
    if (!pickedRank || !pickedSuit || !activeSlotTarget) return;

    const suitObj = SUITS.find((s) => s.symbol === pickedSuit) || { symbol: pickedSuit, cssClass: "suit-spades", isRed: false };
    const card = { rank: pickedRank, suit: pickedSuit, cssClass: suitObj.cssClass, isRed: suitObj.isRed };

    if (activeSlotTarget.startsWith("board")) {
      const idx = parseInt(activeSlotTarget.replace("board", ""), 10);
      boardCards[idx] = card;
    } else if (activeSlotTarget.startsWith("hero")) {
      const idx = parseInt(activeSlotTarget.replace("hero", ""), 10);
      heroCards[idx] = card;
    }

    closeQuickPicker();
    renderSlots();
  }

  function initPokerLab() {
    // Position buttons
    const posBtns = document.querySelectorAll(".pos-btn");
    posBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        posBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentPosition = btn.dataset.pos;
        renderGrid();
        updateInspector(selectedHand);
      });
    });

    // Table Size Selector
    const tableBtns = document.querySelectorAll(".table-size-btn");
    tableBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tableBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        tableSize = parseInt(btn.dataset.size, 10);
        updateInspector(selectedHand);
      });
    });

    // Active Opponents Selector (1 to 6)
    const oppBtns = document.querySelectorAll(".active-opp-btn");
    oppBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        oppBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeOpponents = parseInt(btn.dataset.opps, 10);
        updateInspector(selectedHand);
        evaluatePostflop();
      });
    });

    // Board slots click listeners
    for (let i = 0; i < 5; i++) {
      const slot = document.getElementById(`boardSlot${i}`);
      if (slot) {
        slot.addEventListener("click", () => openQuickPicker(`board${i}`));
      }
    }

    // Hero slots click listeners
    for (let i = 0; i < 2; i++) {
      const slot = document.getElementById(`heroSlot${i}`);
      if (slot) {
        slot.addEventListener("click", () => openQuickPicker(`hero${i}`));
      }
    }

    const clearBtn = document.getElementById("clearBoardBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        boardCards = [null, null, null, null, null];
        heroCards = [null, null];
        renderSlots();
      });
    }

    const pickerModal = document.getElementById("quickCardPicker");
    if (pickerModal) {
      pickerModal.querySelectorAll(".p-rank-btn").forEach((b) => {
        b.addEventListener("click", () => {
          pickerModal.querySelectorAll(".p-rank-btn").forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          pickedRank = b.dataset.rank;
          if (pickedRank && pickedSuit) confirmQuickPick();
        });
      });

      pickerModal.querySelectorAll(".p-suit-btn").forEach((b) => {
        b.addEventListener("click", () => {
          pickerModal.querySelectorAll(".p-suit-btn").forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          pickedSuit = b.dataset.suit;
          if (pickedRank && pickedSuit) confirmQuickPick();
        });
      });

      const pickerCancel = document.getElementById("quickPickerCancel");
      if (pickerCancel) {
        pickerCancel.addEventListener("click", closeQuickPicker);
      }

      const pickerRemove = document.getElementById("quickPickerRemove");
      if (pickerRemove) {
        pickerRemove.addEventListener("click", () => {
          if (activeSlotTarget) {
            clearSingleSlot(activeSlotTarget);
            closeQuickPicker();
          }
        });
      }
    }

    renderSlots();
  }

  window.initPokerLab = initPokerLab;
})();
