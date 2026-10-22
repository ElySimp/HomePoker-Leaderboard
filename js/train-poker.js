// Poker Range Lab: GTO Mixed-Strategy Split Matrix, Multiway Equity, Postflop Solver & Tactical Advisor

(function () {
  const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const RANK_VALUES = {
    A: 14, K: 13, Q: 12, J: 11, T: 10,
    "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
  };

  const SUITS = [
    { symbol: "♠", name: "spades", isRed: false },
    { symbol: "♥", name: "hearts", isRed: true },
    { symbol: "♦", name: "diamonds", isRed: true },
    { symbol: "♣", name: "clubs", isRed: false },
  ];

  const NICKNAMES = {
    AA: "Pocket Rockets / Bullets",
    KK: "Cowboys / King Kong",
    QQ: "Ladies / Dames",
    JJ: "Fishhooks",
    TT: "Dimes",
    "99": "Wayne Gretzky",
    "88": "Snowmen",
    "77": "Walking Sticks",
    "66": "Route 66",
    "55": "Speed Limit",
    "44": "Sailboats",
    "33": "Crabs",
    "22": "Ducks",
    AKs: "Big Slick Suited",
    AKo: "Big Slick Offsuit",
    AQs: "Big Chick Suited",
    AQo: "Big Chick Offsuit",
    AJs: "Blackjack Suited",
    AJo: "Blackjack Offsuit",
    ATs: "Johnny Moss Suited",
    KQs: "Royal Marriage Suited",
    KQo: "Marriage Offsuit",
    KJs: "Kojak Suited",
    QJs: "Maverick Suited",
    JTs: "Downtown Straight Connector",
    "72o": "The Hammer (Worst Hand)",
    "72s": "Beer Hand Suited",
    K9s: "The Dog Hand (Canine)",
    J5o: "Jackson Five",
  };

  const EQUITY_MAP = {
    AA: 85.2, KK: 82.4, QQ: 79.9, JJ: 77.5, TT: 75.1,
    "99": 72.1, "88": 69.1, "77": 66.2, "66": 63.3, "55": 60.3, "44": 57.0, "33": 53.7, "22": 50.3,
    AKs: 67.0, AKo: 65.4, AQs: 66.1, AQo: 64.5, AJs: 65.4, AJo: 63.6, ATs: 64.7, ATo: 62.9,
    A9s: 63.0, A9o: 60.8, A8s: 62.1, A8o: 59.7, A7s: 61.1, A7o: 58.5, A6s: 60.0, A6o: 57.2,
    A5s: 59.9, A5o: 57.1, A4s: 58.9, A4o: 55.9, A3s: 58.0, A3o: 54.8, A2s: 57.0, A2o: 53.7,
    KQs: 63.4, KQo: 61.4, KJs: 62.6, KJo: 60.6, KTs: 61.9, KTo: 59.8, K9s: 60.2, K9o: 57.7,
    K8s: 59.1, K8o: 56.4, K7s: 58.2, K7o: 55.3, K6s: 57.2, K6o: 54.0, K5s: 56.4, K5o: 53.0,
    K4s: 55.4, K4o: 51.8, K3s: 54.5, K3o: 50.7, K2s: 53.5, K2o: 49.5,
    QJs: 60.3, QJo: 58.0, QTs: 59.6, QTo: 57.2, Q9s: 57.9, Q9o: 55.2, Q8s: 56.8, Q8o: 53.8,
    Q7s: 55.6, Q7o: 52.4, Q6s: 54.7, Q6o: 51.2, Q5s: 53.7, Q5o: 50.0, Q4s: 52.8, Q4o: 48.9,
    Q3s: 51.9, Q3o: 47.8, Q2s: 50.9, Q2o: 46.6,
    JTs: 57.5, JTo: 54.8, J9s: 55.8, J9o: 52.8, J8s: 54.7, J8o: 51.4, J7s: 53.4, J7o: 49.9,
    J6s: 52.3, J6o: 48.6, J5s: 51.3, J5o: 47.3, J4s: 50.4, J4o: 46.2, J3s: 49.4, J3o: 45.0,
    J2s: 48.5, J2o: 43.9,
    T9s: 54.3, T9o: 51.0, T8s: 53.2, T8o: 49.6, T7s: 51.9, T7o: 48.1, T6s: 50.7, T6o: 46.6,
    T5s: 49.5, T5o: 45.2, T4s: 48.5, T4o: 44.0, T3s: 47.6, T3o: 42.9, T2s: 46.6, T2o: 41.7,
    "98s": 51.1, "98o": 47.4, "97s": 49.8, "97o": 45.9, "96s": 48.6, "96o": 44.4, "95s": 47.3, "95o": 42.9,
    "94s": 46.1, "94o": 41.5, "93s": 45.1, "93o": 40.4, "92s": 44.1, "92o": 39.2,
    "87s": 48.2, "87o": 44.1, "86s": 46.9, "86o": 42.6, "85s": 45.6, "85o": 41.0, "84s": 44.1, "84o": 39.3,
    "83s": 43.0, "83o": 38.0, "82s": 42.0, "82o": 36.8,
    "76s": 45.7, "76o": 41.3, "75s": 44.3, "75o": 39.6, "74s": 42.8, "74o": 37.9, "73s": 41.4, "73o": 36.3,
    "72s": 40.2, "72o": 34.6,
    "65s": 43.6, "65o": 38.9, "64s": 42.1, "64o": 37.1, "63s": 40.6, "63o": 35.4, "62s": 39.3, "62o": 33.8,
    "54s": 41.7, "54o": 36.7, "53s": 40.1, "53o": 34.9, "52s": 38.7, "52o": 33.3,
    "43s": 39.2, "43o": 33.7, "42s": 37.8, "42o": 32.1,
    "32s": 36.7, "32o": 30.7,
  };

  // State
  let currentPosition = "BTN";
  let selectedHand = "AKs";
  let activeOpponents = 1;
  let tableSize = 6;

  let boardCards = [null, null, null, null, null];
  let heroCards = [null, null];
  let activeSlotTarget = null;

  let pickedRank = null;
  let pickedSuit = null;

  function getMultiwayEquity(headsUp, nOpponents, isPair, isSuited) {
    if (nOpponents <= 1) return headsUp;
    const p = headsUp / 100;
    const decayCoeff = isPair ? 0.94 : isSuited ? 0.92 : 1.0;
    const eq = (p / (p + nOpponents * (1 - p) * decayCoeff)) * 100;
    return Math.max(2.0, Math.min(99.0, eq));
  }

  function getHandNotation(row, col) {
    const r1 = RANKS[row];
    const r2 = RANKS[col];
    if (row === col) return `${r1}${r2}`;
    if (row < col) return `${r1}${r2}s`;
    return `${r2}${r1}o`;
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

  // --- Hand Evaluator: Scores 5 to 7 cards ---
  function evaluateHandRank(cards) {
    if (cards.length < 5) return [0, 0, 0, 0, 0, 0, "Incomplete"];

    const suits = {};
    cards.forEach((c) => {
      suits[c.suit] = suits[c.suit] || [];
      suits[c.suit].push(c);
    });

    let flushSuit = null;
    for (const s in suits) {
      if (suits[s].length >= 5) {
        flushSuit = s;
        break;
      }
    }

    if (flushSuit) {
      const flushCards = suits[flushSuit].map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
      if (flushCards.includes(14)) flushCards.push(1);
      for (let i = 0; i <= flushCards.length - 5; i++) {
        if (
          flushCards[i] - 1 === flushCards[i + 1] &&
          flushCards[i + 1] - 1 === flushCards[i + 2] &&
          flushCards[i + 2] - 1 === flushCards[i + 3] &&
          flushCards[i + 3] - 1 === flushCards[i + 4]
        ) {
          const high = flushCards[i];
          const name = high === 14 ? "Royal Flush" : `Straight Flush (${high}-high)`;
          return [8, high, 0, 0, 0, 0, name];
        }
      }
    }

    const counts = {};
    cards.forEach((c) => {
      const v = RANK_VALUES[c.rank];
      counts[v] = (counts[v] || 0) + 1;
    });

    const freqs = Object.entries(counts)
      .map(([v, cnt]) => [parseInt(v, 10), cnt])
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    if (freqs[0][1] === 4) {
      const quadRank = freqs[0][0];
      const kicker = freqs[1][0];
      return [7, quadRank, kicker, 0, 0, 0, `Four of a Kind (${quadRank}'s)`];
    }

    if (freqs[0][1] === 3 && freqs[1][1] >= 2) {
      const tripRank = freqs[0][0];
      const pairRank = freqs[1][0];
      return [6, tripRank, pairRank, 0, 0, 0, `Full House (${tripRank}'s full of ${pairRank}'s)`];
    }

    if (flushSuit) {
      const flushVals = suits[flushSuit]
        .map((c) => RANK_VALUES[c.rank])
        .sort((a, b) => b - a)
        .slice(0, 5);
      return [5, flushVals[0], flushVals[1], flushVals[2], flushVals[3], flushVals[4], `Flush (${flushVals[0]}-high)`];
    }

    const uniqueVals = Array.from(new Set(cards.map((c) => RANK_VALUES[c.rank]))).sort((a, b) => b - a);
    if (uniqueVals.includes(14)) uniqueVals.push(1);
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      if (
        uniqueVals[i] - 1 === uniqueVals[i + 1] &&
        uniqueVals[i + 1] - 1 === uniqueVals[i + 2] &&
        uniqueVals[i + 2] - 1 === uniqueVals[i + 3] &&
        uniqueVals[i + 3] - 1 === uniqueVals[i + 4]
      ) {
        const high = uniqueVals[i];
        return [4, high, 0, 0, 0, 0, `Straight (${high}-high)`];
      }
    }

    if (freqs[0][1] === 3) {
      const tripRank = freqs[0][0];
      const kickers = freqs.slice(1).map((f) => f[0]).slice(0, 2);
      return [3, tripRank, kickers[0], kickers[1], 0, 0, `Three of a Kind (${tripRank}'s)`];
    }

    if (freqs[0][1] === 2 && freqs[1][1] === 2) {
      const highPair = freqs[0][0];
      const lowPair = freqs[1][0];
      const kicker = freqs[2][0];
      return [2, highPair, lowPair, kicker, 0, 0, `Two Pair (${highPair}'s and ${lowPair}'s)`];
    }

    if (freqs[0][1] === 2) {
      const pairRank = freqs[0][0];
      const kickers = freqs.slice(1).map((f) => f[0]).slice(0, 3);
      return [1, pairRank, kickers[0], kickers[1], kickers[2], 0, `One Pair (${pairRank}'s)`];
    }

    const highKickers = freqs.map((f) => f[0]).slice(0, 5);
    return [0, highKickers[0], highKickers[1], highKickers[2], highKickers[3], highKickers[4], `High Card (${highKickers[0]})`];
  }

  // --- GTO Mixed Strategy Calculator ---
  // Returns: { raise: %, call: %, fold: %, advice: string, actionTitle: string }
  function getGTOFrequencies(hand) {
    const validBoard = boardCards.filter(Boolean);
    const validHero = heroCards.filter(Boolean);
    const isPostflop = validBoard.length >= 3;

    // Postflop GTO Action Frequencies (adapted to board texture)
    if (isPostflop) {
      const r1 = hand[0];
      const r2 = hand[1];
      const isSuited = hand.endsWith("s");
      const isPair = r1 === r2;

      // Sample a representative combo of this hand
      const sampleCombo = isSuited
        ? [{ rank: r1, suit: "♠" }, { rank: r2, suit: "♠" }]
        : [{ rank: r1, suit: "♠" }, { rank: r2, suit: "♥" }];

      const score = evaluateHandRank([...validBoard, ...sampleCombo]);
      const cat = score[0]; // 0=High Card, 1=Pair, 2=TwoPair, 3=Trips, 4=Straight, 5=Flush, 6=FullHouse, 7=Quads, 8=StrFlush

      const boardValues = validBoard.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
      const highestBoard = boardValues[0];
      const handVals = [RANK_VALUES[r1], RANK_VALUES[r2]].sort((a, b) => b - a);

      if (cat >= 4) {
        // Monster (Straight, Flush, Full House, Quads)
        return {
          raise: 75,
          call: 25,
          fold: 0,
          primaryAction: "3bet",
          actionTitle: "Bet / Fast-Play (75%) | Check-Call (25%)",
          advice: `Premium holding (${score[6]}). Bet or raise 66%-75% pot for maximum value; occasionally check to trap aggressive opponents.`,
        };
      }

      if (cat === 3) {
        // Three of a Kind / Set
        return {
          raise: 70,
          call: 30,
          fold: 0,
          primaryAction: "3bet",
          actionTitle: "Bet (70%) | Check-Call (30%)",
          advice: `Strong Three of a Kind. Fast-play value bet (70%) to charge flush/straight draws; check-call on dry runouts.`,
        };
      }

      if (cat === 2) {
        // Two Pair
        return {
          raise: 60,
          call: 40,
          fold: 0,
          primaryAction: "raise",
          actionTitle: "Bet / Raise (60%) | Call (40%)",
          advice: `Two Pair. Bet for value and protection (60%) against single pairs and draws; proceed with pot-control on heavy draw boards.`,
        };
      }

      if (cat === 1) {
        const pairRank = score[1];
        if (pairRank > highestBoard) {
          // Overpair
          return {
            raise: 60,
            call: 40,
            fold: 0,
            primaryAction: "raise",
            actionTitle: "C-Bet (60%) | Pot-Control Call (40%)",
            advice: `Overpair beats all single board pairs. Continuation bet 40%-55% pot for value and protection.`,
          };
        } else if (pairRank === highestBoard) {
          // Top Pair
          const kicker = handVals[0] === pairRank ? handVals[1] : handVals[0];
          if (kicker >= 12) {
            return {
              raise: 55,
              call: 45,
              fold: 0,
              primaryAction: "raise",
              actionTitle: "Value Bet (55%) | Check-Call (45%)",
              advice: `Top Pair with strong kicker. Bet 33%-50% pot to target second pair, or check-call against aggressive lines.`,
            };
          } else {
            return {
              raise: 20,
              call: 65,
              fold: 15,
              primaryAction: "call",
              actionTitle: "Check-Call (65%) | Bet (20%) | Fold (15%)",
              advice: `Top Pair with weak kicker. Play pot-control via check-call; avoid inflating the pot against better kickers.`,
            };
          }
        } else {
          // Second Pair / Underpair
          return {
            raise: 10,
            call: 60,
            fold: 30,
            primaryAction: "call",
            actionTitle: "Check-Call (60%) | Fold (30%) | Bet (10%)",
            advice: `Middle or underpair with marginal showdown value. Check to catch bluffs; fold if facing multi-street aggression.`,
          };
        }
      }

      // High Card: Check for draws
      if (isSuited) {
        return {
          raise: 45,
          call: 45,
          fold: 10,
          primaryAction: "call",
          actionTitle: "Semi-Bluff Bet (45%) | Call (45%) | Fold (10%)",
          advice: `High-equity drawing potential (Flush/Straight draw). Excellent semi-bluff candidate (45%) to induce folds, or flat call with implied odds.`,
        };
      }

      // Air / Weak High Card
      return {
        raise: 5,
        call: 10,
        fold: 85,
        primaryAction: "fold",
        actionTitle: "Check-Fold (85%) | Float (10%) | Bluff (5%)",
        advice: `Unimproved holding with minimal equity on this board. Standard GTO line is a disciplined Check-Fold.`,
      };
    }

    // --- Preflop GTO Action Frequencies ---
    const pos = currentPosition;
    const baseEquity = EQUITY_MAP[hand] !== undefined ? EQUITY_MAP[hand] : 50.0;
    const isPair = hand.length === 2 && hand[0] === hand[1];
    const isSuited = hand.endsWith("s");

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

  function renderGrid() {
    const grid = document.getElementById("pokerGrid");
    if (!grid) return;
    grid.innerHTML = "";

    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const hand = getHandNotation(r, c);
        const dead = isHandDead(hand);
        const freqs = getGTOFrequencies(hand);

        const cell = document.createElement("div");
        const actionClass = freqs.primaryAction ? `act-${freqs.primaryAction}` : "act-fold";
        cell.className = `hand-cell ${actionClass} ${dead ? "dead-hand" : ""} ${hand === selectedHand ? "active-hand" : ""}`;
        cell.textContent = hand;
        cell.dataset.hand = hand;

        // Clean styling without intrusive background gradients
        cell.style.background = "";

        cell.addEventListener("click", () => {
          selectedHand = hand;
          renderGrid();
          updateInspector(hand);
        });

        grid.appendChild(cell);
      }
    }
  }

  function updateInspector(hand) {
    const badge = document.getElementById("inspHandBadge");
    const nick = document.getElementById("inspHandNick");
    const eqVal = document.getElementById("inspEquityVal");
    const actVal = document.getElementById("inspActionVal");
    const advice = document.getElementById("inspAdvice");
    if (!badge) return;

    badge.textContent = hand;
    nick.textContent = NICKNAMES[hand] || (hand.endsWith("s") ? "Suited Hand" : hand.endsWith("o") ? "Offsuit Hand" : "Pocket Pair");

    const isPair = hand.length === 2 && hand[0] === hand[1];
    const isSuited = hand.endsWith("s");
    const baseEquity = EQUITY_MAP[hand] !== undefined ? EQUITY_MAP[hand] : 50.0;
    const multiEquity = getMultiwayEquity(baseEquity, activeOpponents, isPair, isSuited);

    eqVal.innerHTML = `${multiEquity.toFixed(1)}% <span style="font-size:10px;color:var(--muted);font-weight:normal">(vs ${activeOpponents} ${activeOpponents === 1 ? "opp" : "opps"})</span>`;

    const freqs = getGTOFrequencies(hand);

    // GTO Frequency Bar HTML with matched harmonious colors
    const is3Bet = freqs.primaryAction === "3bet";
    const raiseBarClass = is3Bet ? "gto-bar-3bet" : "gto-bar-raise";
    const raiseLblClass = is3Bet ? "lbl-3bet" : "lbl-raise";
    const raiseLabel = is3Bet ? "3-Bet" : "Raise/Bet";

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

    updateBluffRadar();
  }

  // --- Bluffing Radar: Hero Fold Equity & Opponent Bluff Likelihood ---
  function updateBluffRadar() {
    const heroBluffBadge = document.getElementById("heroBluffBadge");
    const heroBluffDesc = document.getElementById("heroBluffDesc");
    const oppBluffBadge = document.getElementById("oppBluffBadge");
    const oppBluffDesc = document.getElementById("oppBluffDesc");
    if (!heroBluffBadge || !oppBluffBadge) return;

    const validBoard = boardCards.filter(Boolean);
    const validHero = heroCards.filter(Boolean);

    if (validBoard.length < 3) {
      heroBluffBadge.className = "bluff-badge-low";
      heroBluffBadge.textContent = "Awaiting Flop";
      heroBluffDesc.textContent = "Deal 3 board cards to calculate bluffing opportunities.";
      oppBluffBadge.className = "bluff-badge-low";
      oppBluffBadge.textContent = "Preflop Mode";
      oppBluffDesc.textContent = "Preflop betting reflects starting hand selection.";
      return;
    }

    const boardValues = validBoard.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const hasAce = boardValues.includes(14);

    const suitCounts = {};
    validBoard.forEach((c) => {
      suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    const isMonotone = maxSuitCount >= 3;

    const isRiver = validBoard.length === 5;
    const missedFlushDraw = isRiver && maxSuitCount === 2;
    const heroHitsHigh = validHero.some((c) => RANK_VALUES[c.rank] >= 13);

    // Hero Bluff Opportunity
    if ((hasAce || isMonotone) && !heroHitsHigh) {
      heroBluffBadge.className = "bluff-badge-high";
      heroBluffBadge.textContent = "⚡ High Fold Equity";
      heroBluffDesc.textContent = `Scare card on board (${hasAce ? "Ace" : "Flush threat"}). A 55%-65% pot bet exerts maximum fold pressure on opponent's second pairs.`;
    } else if (validBoard.length >= 3 && !hasAce && maxSuitCount <= 1) {
      heroBluffBadge.className = "bluff-badge-low";
      heroBluffBadge.textContent = "🛡️ Low Viability";
      heroBluffDesc.textContent = "Dry, disconnected board. Opponents who hit top pair will call down easily; bluffing here has low fold equity.";
    } else {
      heroBluffBadge.className = "bluff-badge-high";
      heroBluffBadge.textContent = "⚖️ Moderate (Semi-Bluff)";
      heroBluffDesc.textContent = "Viable for semi-bluffing if holding equity draws (gutshot, overcards, or backdoor flushes).";
    }

    // Opponent Bluff Likelihood
    if (missedFlushDraw) {
      oppBluffBadge.className = "bluff-badge-high";
      oppBluffBadge.textContent = "⚠️ High Bluff Likelihood (~65%)";
      oppBluffDesc.textContent = "Flush and straight draws missed on the river! A large opponent bet is heavily polarized between a monster or a busted draw bluff.";
    } else if (validBoard.length >= 4 && maxSuitCount <= 2 && !hasAce) {
      oppBluffBadge.className = "bluff-badge-low";
      oppBluffBadge.textContent = "🛡️ Low Bluff Likelihood (~20%)";
      oppBluffDesc.textContent = "Clean runout without obvious busted draws. Opponent bet likely represents genuine value (strong pair or better).";
    } else {
      oppBluffBadge.className = "bluff-badge-high";
      oppBluffBadge.textContent = "⚖️ Medium Likelihood (~40%)";
      oppBluffDesc.textContent = "Balanced board runout. Consider opponent's sizing and previous round aggression.";
    }
  }

  // --- Postflop Tactical Advisor Card ---
  function evaluatePostflop() {
    const madeBadge = document.getElementById("postflopMadeBadge");
    const recBadge = document.getElementById("postflopRecBadge");
    const reasoningBox = document.getElementById("postflopReasoning");
    if (!madeBadge || !recBadge || !reasoningBox) return;

    const validBoard = boardCards.filter(Boolean);
    const validHero = heroCards.filter(Boolean);

    if (validBoard.length < 3) {
      madeBadge.textContent = "Awaiting Flop Cards";
      recBadge.className = "action-rec-badge rec-waiting";
      recBadge.textContent = "Preflop Mode";
      reasoningBox.innerHTML = `Select at least <b>3 Flop cards</b> in the board slots above to analyze postflop hand strength and GTO solver recommendations.`;
      updateBluffRadar();
      return;
    }

    if (validHero.length < 2) {
      madeBadge.textContent = `${validBoard.length}-Card Board Analyzed`;
      recBadge.className = "action-rec-badge rec-waiting";
      recBadge.textContent = "Pick Hero Cards";
      reasoningBox.innerHTML = `Select your <b>2 Hero Cards</b> above to calculate your exact hand ranking and optimal action against this board.`;
      updateBluffRadar();
      return;
    }

    const allCards = [...validBoard, ...validHero];
    const score = evaluateHandRank(allCards);
    const cat = score[0];
    const handName = score[6];

    const boardValues = validBoard.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const heroValues = validHero.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const highestBoard = boardValues[0];

    let moveRec = "Check / Fold";
    let recClass = "rec-check-fold";
    let reasoning = "";

    if (cat >= 4) {
      moveRec = "🔥 Value Bet / Raise (66% - 75% Pot)";
      recClass = "rec-value-bet";
      reasoning = `Monster hand (${handName}). Bet or raise generously to build the pot against flushes, straights, and sets.`;
    } else if (cat === 3) {
      moveRec = "✅ Value Bet (50% - 66% Pot)";
      recClass = "rec-value-bet";
      reasoning = `Three of a Kind (${handName}). Bet to build the pot and charge drawing hands.`;
    } else if (cat === 2) {
      moveRec = "✅ Bet / Call (40% - 60% Pot)";
      recClass = "rec-value-bet";
      reasoning = `Two Pair (${handName}). Ahead of single pairs. Bet for value on dry boards; check-call on wet boards.`;
    } else if (cat === 1) {
      const heroIsPair = validHero[0].rank === validHero[1].rank;
      if (heroIsPair && heroValues[0] > highestBoard) {
        moveRec = "✅ Bet / C-Bet (40% - 55% Pot)";
        recClass = "rec-value-bet";
        reasoning = `Pocket overpair beats all single board pairs. Continuation bet for value and protection.`;
      } else if (validHero.some((h) => RANK_VALUES[h.rank] === highestBoard)) {
        moveRec = "✅ Bet / C-Bet (33% - 50% Pot)";
        recClass = "rec-value-bet";
        reasoning = `Top pair with solid kicker. Bet for value against middle pairs, or call reasonable bets.`;
      } else {
        moveRec = "🔷 Check-Call / Pot Control";
        recClass = "rec-check-call";
        reasoning = `Middle or bottom pair. Check to keep pot small and catch bluffs; fold if facing multi-street aggression.`;
      }
    } else {
      moveRec = "❌ Check / Fold";
      recClass = "rec-check-fold";
      reasoning = "Unimproved holding with minimal equity on this board texture. Check and give up to any bet.";
    }

    madeBadge.textContent = handName;
    recBadge.className = `action-rec-badge ${recClass}`;
    recBadge.textContent = moveRec;
    reasoningBox.innerHTML = `<b>Tactical Recommendation:</b> ${reasoning}`;

    updateBluffRadar();
  }

  function renderSlots() {
    for (let i = 0; i < 5; i++) {
      const slot = document.getElementById(`boardSlot${i}`);
      if (!slot) continue;
      const c = boardCards[i];
      if (c) {
        slot.className = `card-slot filled ${c.isRed ? "red-suit" : ""}`;
        slot.innerHTML = `<span class="slot-rank">${c.rank}</span><span class="slot-suit">${c.suit}</span>`;
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
        slot.className = `card-slot filled ${c.isRed ? "red-suit" : ""}`;
        slot.innerHTML = `<span class="slot-rank">${c.rank}</span><span class="slot-suit">${c.suit}</span>`;
      } else {
        slot.className = "card-slot";
        slot.innerHTML = `<span style="font-size:10px;color:var(--muted)">Card ${i + 1}</span>`;
      }
    }

    evaluatePostflop();
    renderGrid();
    updateInspector(selectedHand);
  }

  function openQuickPicker(target) {
    activeSlotTarget = target;
    pickedRank = null;
    pickedSuit = null;

    const modal = document.getElementById("quickCardPicker");
    if (!modal) return;
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

    const suitObj = SUITS.find((s) => s.symbol === pickedSuit) || { symbol: pickedSuit, isRed: false };
    const card = { rank: pickedRank, suit: pickedSuit, isRed: suitObj.isRed };

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

    // Table Size Selector (2 to 9)
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
    }

    renderSlots();
  }

  window.initPokerLab = initPokerLab;
})();
