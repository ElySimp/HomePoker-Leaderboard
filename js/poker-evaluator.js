// Poker Evaluator & GTO Tactical Engine
// Handles 5-to-7 card hand evaluation, draws & outs calculation, multiway equity, and bluff metrics.

(function (root) {
  const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const RANK_VALUES = {
    A: 14, K: 13, Q: 12, J: 11, T: 10,
    "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
  };

  const SUITS = [
    { symbol: "♠", name: "spades", cssClass: "suit-spades", isRed: false },
    { symbol: "♥", name: "hearts", cssClass: "suit-hearts", isRed: true },
    { symbol: "♦", name: "diamonds", cssClass: "suit-diamonds", isRed: true },
    { symbol: "♣", name: "clubs", cssClass: "suit-clubs", isRed: false },
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

  // --- Hand Evaluator (Best 5 of 5-7 cards) ---
  // Returns: [categoryRank, tiebreak1, tiebreak2, tiebreak3, tiebreak4, tiebreak5, handName]
  // categoryRank: 8=StraightFlush, 7=Quads, 6=FullHouse, 5=Flush, 4=Straight, 3=Trips, 2=TwoPair, 1=Pair, 0=HighCard
  function evaluateHandRank(cards) {
    if (!cards || cards.length < 5) return [0, 0, 0, 0, 0, 0, "Incomplete"];

    // Count suits for flush check
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

    // Check Straight Flush
    if (flushSuit) {
      const flushVals = Array.from(new Set(suits[flushSuit].map((c) => RANK_VALUES[c.rank]))).sort((a, b) => b - a);
      if (flushVals.includes(14)) flushVals.push(1); // Ace-low straight flush
      for (let i = 0; i <= flushVals.length - 5; i++) {
        if (
          flushVals[i] - 1 === flushVals[i + 1] &&
          flushVals[i + 1] - 1 === flushVals[i + 2] &&
          flushVals[i + 2] - 1 === flushVals[i + 3] &&
          flushVals[i + 3] - 1 === flushVals[i + 4]
        ) {
          const high = flushVals[i];
          const name = high === 14 ? "Royal Flush" : `Straight Flush (${high}-high)`;
          return [8, high, 0, 0, 0, 0, name];
        }
      }
    }

    // Rank frequency counts
    const counts = {};
    cards.forEach((c) => {
      const v = RANK_VALUES[c.rank];
      counts[v] = (counts[v] || 0) + 1;
    });

    const freqs = Object.entries(counts)
      .map(([v, cnt]) => [parseInt(v, 10), cnt])
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    // Four of a Kind
    if (freqs[0][1] === 4) {
      const quadRank = freqs[0][0];
      const kicker = freqs[1][0];
      return [7, quadRank, kicker, 0, 0, 0, `Four of a Kind (${quadRank}'s)`];
    }

    // Full House
    if (freqs[0][1] === 3 && freqs[1][1] >= 2) {
      const tripRank = freqs[0][0];
      const pairRank = freqs[1][0];
      return [6, tripRank, pairRank, 0, 0, 0, `Full House (${tripRank}'s full of ${pairRank}'s)`];
    }

    // Flush
    if (flushSuit) {
      const flushVals = suits[flushSuit]
        .map((c) => RANK_VALUES[c.rank])
        .sort((a, b) => b - a)
        .slice(0, 5);
      return [5, flushVals[0], flushVals[1], flushVals[2], flushVals[3], flushVals[4], `Flush (${flushVals[0]}-high)`];
    }

    // Straight
    const uniqueVals = Array.from(new Set(cards.map((c) => RANK_VALUES[c.rank]))).sort((a, b) => b - a);
    if (uniqueVals.includes(14)) uniqueVals.push(1); // Ace-low straight
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

    // Three of a Kind
    if (freqs[0][1] === 3) {
      const tripRank = freqs[0][0];
      const kickers = freqs.slice(1).map((f) => f[0]).slice(0, 2);
      return [3, tripRank, kickers[0], kickers[1], 0, 0, `Three of a Kind (${tripRank}'s)`];
    }

    // Two Pair
    if (freqs[0][1] === 2 && freqs[1][1] === 2) {
      const highPair = freqs[0][0];
      const lowPair = freqs[1][0];
      const kicker = freqs[2][0];
      return [2, highPair, lowPair, kicker, 0, 0, `Two Pair (${highPair}'s and ${lowPair}'s)`];
    }

    // One Pair
    if (freqs[0][1] === 2) {
      const pairRank = freqs[0][0];
      const kickers = freqs.slice(1).map((f) => f[0]).slice(0, 3);
      return [1, pairRank, kickers[0], kickers[1], kickers[2], 0, `One Pair (${pairRank}'s)`];
    }

    // High Card
    const highKickers = freqs.map((f) => f[0]).slice(0, 5);
    return [0, highKickers[0], highKickers[1], highKickers[2], highKickers[3], highKickers[4], `High Card (${highKickers[0]})`];
  }

  function compareHandScores(scoreA, scoreB) {
    for (let i = 0; i < 6; i++) {
      if (scoreA[i] > scoreB[i]) return 1;
      if (scoreA[i] < scoreB[i]) return -1;
    }
    return 0;
  }

  // --- Draw & Outs Evaluator ---
  function detectDrawsAndOuts(hero, board) {
    if (!hero || hero.length < 2 || !board || board.length < 3) {
      return { outs: 0, name: "", equityPct: 0, isMonster: false, isFlushDraw: false, isStraightDraw: false };
    }

    const all = [...board, ...hero];
    const isRiver = board.length === 5;
    if (isRiver) {
      return { outs: 0, name: "Showdown", equityPct: 0, isMonster: false, isFlushDraw: false, isStraightDraw: false };
    }

    const cardsToCome = board.length === 3 ? 2 : 1;

    // 1. Flush Draw check
    let flushOuts = 0;
    let isNutFlush = false;
    let flushSuit = null;
    const suitCounts = {};
    const heroSuitCounts = {};

    all.forEach((c) => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
    hero.forEach((c) => { heroSuitCounts[c.suit] = (heroSuitCounts[c.suit] || 0) + 1; });

    for (const suit of ["♠", "♥", "♦", "♣"]) {
      if (suitCounts[suit] === 4 && (heroSuitCounts[suit] || 0) >= 1) {
        flushSuit = suit;
        flushOuts = 9;
        isNutFlush = hero.some((c) => c.suit === suit && c.rank === "A");
        break;
      }
    }

    // 2. Straight Draw check (OESD, Gutshots, Double Gutshots)
    const uniqueVals = Array.from(new Set(all.map((c) => RANK_VALUES[c.rank]))).sort((a, b) => a - b);
    if (uniqueVals.includes(14)) uniqueVals.unshift(1); // Ace-low

    const neededRanks = new Set();
    let straightDrawType = "";

    // Check all 5-card spans from low=1 (A-2-3-4-5) to low=10 (T-J-Q-K-A)
    for (let low = 1; low <= 10; low++) {
      const span = [low, low + 1, low + 2, low + 3, low + 4];
      const matchCount = span.filter((v) => uniqueVals.includes(v)).length;

      if (matchCount === 4) {
        const missing = span.find((v) => !uniqueVals.includes(v));
        // Ensure Hero holds at least one card in this straight draw
        const heroInSpan = hero.some((h) => {
          const hv = RANK_VALUES[h.rank];
          return span.includes(hv) || (hv === 14 && span.includes(1));
        });

        if (heroInSpan && missing !== undefined) {
          const actualRank = missing === 1 ? 14 : missing;
          neededRanks.add(actualRank);

          // OESD when the missing card is at an open end of a continuous 4-card sequence
          if ((missing === low || missing === low + 4) && low >= 2 && low <= 9) {
            straightDrawType = "OESD";
          } else if (!straightDrawType) {
            straightDrawType = "Gutshot";
          }
        }
      }
    }

    let straightOuts = 0;
    if (neededRanks.size >= 2) {
      straightOuts = Math.min(8, neededRanks.size * 4);
      if (straightDrawType !== "OESD") straightDrawType = "Double Gutshot";
    } else if (neededRanks.size === 1) {
      straightOuts = 4;
      if (!straightDrawType) straightDrawType = "Gutshot";
    }

    // 3. Overcard Outs
    const boardValues = board.map((c) => RANK_VALUES[c.rank]);
    const maxBoard = Math.max(...boardValues);
    let overcardOuts = 0;
    hero.forEach((h) => {
      if (RANK_VALUES[h.rank] > maxBoard) overcardOuts += 3;
    });

    let totalOuts = 0;
    let name = "";

    if (flushOuts > 0 && straightOuts > 0) {
      // Deduct overlap card
      totalOuts = flushOuts + straightOuts - (straightOuts >= 8 ? 2 : 1);
      name = `Monster Combo Draw (${isNutFlush ? "Nut " : ""}Flush + ${straightDrawType})`;
    } else if (flushOuts > 0) {
      totalOuts = flushOuts;
      name = `${isNutFlush ? "Nut " : ""}Flush Draw`;
    } else if (straightOuts > 0) {
      totalOuts = straightOuts;
      name = straightDrawType === "OESD" ? "Open-Ended Straight Draw" : straightDrawType === "Double Gutshot" ? "Double Gutshot Draw" : "Gutshot Straight Draw";
    } else if (overcardOuts > 0) {
      totalOuts = overcardOuts;
      name = overcardOuts >= 6 ? "Two Overcards" : "One Overcard";
    }

    let equityPct = 0;
    if (cardsToCome === 2) {
      equityPct = Math.min(98, Math.round(totalOuts * 4 - Math.max(0, totalOuts - 8)));
    } else {
      equityPct = Math.min(95, Math.round(totalOuts * 2.15));
    }

    return {
      outs: totalOuts,
      name,
      equityPct,
      isMonster: totalOuts >= 12,
      isFlushDraw: flushOuts > 0,
      isStraightDraw: straightOuts > 0,
    };
  }

  // --- Real-time Multiway Equity Simulator (Hero vs N Opponents) ---
  function calculateHeroEquity(hero, board, nOpponents) {
    if (!hero || hero.length < 2) return { heroWin: 0, tie: 0, oppWin: 0 };
    const validBoard = (board || []).filter(Boolean);
    const validHero = hero.filter(Boolean);
    if (validHero.length < 2) return { heroWin: 0, tie: 0, oppWin: 0 };

    const oppCount = Math.max(1, Math.min(6, nOpponents || 1));

    // Preflop lookup
    if (validBoard.length < 3) {
      const h1 = validHero[0].rank;
      const h2 = validHero[1].rank;
      const isPair = h1 === h2;
      const isSuited = validHero[0].suit === validHero[1].suit;
      let handStr = isPair ? `${h1}${h2}` : RANK_VALUES[h1] >= RANK_VALUES[h2] ? `${h1}${h2}${isSuited ? "s" : "o"}` : `${h2}${h1}${isSuited ? "s" : "o"}`;
      const baseEq = EQUITY_MAP[handStr] !== undefined ? EQUITY_MAP[handStr] : 50.0;

      // Multiway decay model
      const p = baseEq / 100;
      const decayCoeff = isPair ? 0.94 : isSuited ? 0.92 : 1.0;
      const heroWin = (p / (p + oppCount * (1 - p) * decayCoeff)) * 100;
      const clampedWin = Math.max(2.0, Math.min(98.0, heroWin));
      return {
        heroWin: parseFloat(clampedWin.toFixed(1)),
        tie: 1.5,
        oppWin: parseFloat(Math.max(0.5, 100 - clampedWin - 1.5).toFixed(1)),
      };
    }

    // Postflop Monte Carlo Simulation
    const taken = new Set([...validBoard, ...validHero].map((c) => `${c.rank}${c.suit}`));
    const deck = [];
    RANKS.forEach((r) => {
      SUITS.forEach((s) => {
        if (!taken.has(`${r}${s.symbol}`)) {
          deck.push({ rank: r, suit: s.symbol, isRed: s.isRed });
        }
      });
    });

    const cardsNeeded = 5 - validBoard.length;
    const SIM_COUNT = 600;
    let heroWins = 0;
    let ties = 0;

    for (let sim = 0; sim < SIM_COUNT; sim++) {
      const deckCopy = [...deck];
      const sampleSize = cardsNeeded + oppCount * 2;
      for (let i = 0; i < sampleSize; i++) {
        const randIdx = i + Math.floor(Math.random() * (deckCopy.length - i));
        const temp = deckCopy[i];
        deckCopy[i] = deckCopy[randIdx];
        deckCopy[randIdx] = temp;
      }

      const runoutBoard = [...validBoard, ...deckCopy.slice(0, cardsNeeded)];
      const heroScore = evaluateHandRank([...runoutBoard, ...validHero]);

      let heroBeatsAll = true;
      let hasTieWithLeader = false;
      let cardPtr = cardsNeeded;

      for (let op = 0; op < oppCount; op++) {
        const opCards = [deckCopy[cardPtr], deckCopy[cardPtr + 1]];
        cardPtr += 2;
        const opScore = evaluateHandRank([...runoutBoard, ...opCards]);
        const comp = compareHandScores(heroScore, opScore);

        if (comp < 0) {
          heroBeatsAll = false;
          hasTieWithLeader = false;
          break;
        } else if (comp === 0) {
          hasTieWithLeader = true;
        }
      }

      if (heroBeatsAll) {
        if (hasTieWithLeader) ties++;
        else heroWins++;
      }
    }

    const heroWinPct = (heroWins / SIM_COUNT) * 100;
    const tiePct = (ties / SIM_COUNT) * 100;
    const oppWinPct = Math.max(0, 100.0 - heroWinPct - tiePct);

    return {
      heroWin: parseFloat(heroWinPct.toFixed(1)),
      tie: parseFloat(tiePct.toFixed(1)),
      oppWin: parseFloat(oppWinPct.toFixed(1)),
    };
  }

  // --- Bluff Radar Metrics ---
  function calculateBluffMetrics(hero, board, nOpponents) {
    const validBoard = (board || []).filter(Boolean);
    const validHero = (hero || []).filter(Boolean);
    const oppCount = Math.max(1, Math.min(6, nOpponents || 1));

    if (validBoard.length < 3) {
      return { heroFoldEquity: 0, oppBluffLikelihood: 0, isAvailable: false };
    }

    const boardValues = validBoard.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const hasAce = boardValues.includes(14);
    const hasKing = boardValues.includes(13);

    const suitCounts = {};
    validBoard.forEach((c) => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
    const maxSuitCount = Math.max(...Object.values(suitCounts), 0);
    const isMonotone = maxSuitCount >= 3;
    const isTwoTone = maxSuitCount === 2;
    const isPairedBoard = boardValues[0] === boardValues[1] || (boardValues.length >= 3 && boardValues[1] === boardValues[2]);

    // 1. Hero Fold Equity / Bluff Viability
    let heroBluff = 52;
    if (hasAce) heroBluff += 15;
    if (isMonotone) heroBluff += 12;
    if (isPairedBoard) heroBluff += 10;

    if (validHero.length === 2) {
      const heroSuits = validHero.map((c) => c.suit);
      const dominantSuit = Object.keys(suitCounts).find((s) => suitCounts[s] === maxSuitCount);
      if (dominantSuit && heroSuits.includes(dominantSuit)) heroBluff += 12;
      if (validHero.some((c) => c.rank === "A")) heroBluff += 10;
    }

    // Multiway penalty for fold equity
    if (oppCount > 1) {
      heroBluff -= (oppCount - 1) * 9;
    }

    if (!hasAce && !hasKing && maxSuitCount === 1) {
      heroBluff -= 10;
    }

    heroBluff = Math.max(15, Math.min(88, Math.round(heroBluff)));

    // 2. Opponent Bluff Likelihood
    let oppBluff = 46;
    const isRiver = validBoard.length === 5;
    const isTurn = validBoard.length === 4;

    if (isRiver) {
      if (isTwoTone || isMonotone) oppBluff += 22; // Missed draws
      if (!hasAce && !hasKing) oppBluff += 10;
    } else if (isTurn) {
      if (isTwoTone || isMonotone) oppBluff += 12;
    } else {
      if (isTwoTone) oppBluff += 8;
    }

    if (oppCount > 1) {
      oppBluff -= (oppCount - 1) * 7;
    }

    oppBluff = Math.max(18, Math.min(85, Math.round(oppBluff)));

    return {
      heroFoldEquity: heroBluff,
      oppBluffLikelihood: oppBluff,
      isAvailable: true,
    };
  }

  // --- Dynamic 13x13 Postflop Range Classifier ---
  // Evaluates how any hand notation (e.g. 'AKs', 'AKo', 'TT', '64s') plays on the current board
  function evaluateHandOnBoard(hand, board) {
    const validBoard = (board || []).filter(Boolean);
    const r1 = hand[0];
    const r2 = hand[1];
    const isSuited = hand.endsWith("s");
    const isPair = r1 === r2;

    // Pick dominant suit from board to give suited combos realistic equity
    const boardSuitCounts = {};
    validBoard.forEach((c) => { boardSuitCounts[c.suit] = (boardSuitCounts[c.suit] || 0) + 1; });
    const dominantSuit = Object.keys(boardSuitCounts).sort((a, b) => boardSuitCounts[b] - boardSuitCounts[a])[0] || "♠";
    const secondarySuit = dominantSuit === "♠" ? "♥" : "♠";

    const sampleCombo = isSuited
      ? [{ rank: r1, suit: dominantSuit }, { rank: r2, suit: dominantSuit }]
      : [{ rank: r1, suit: dominantSuit }, { rank: r2, suit: secondarySuit }];

    const score = evaluateHandRank([...validBoard, ...sampleCombo]);
    const cat = score[0];
    const handName = score[6];

    const boardValues = validBoard.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const highestBoard = boardValues[0];
    const handVals = [RANK_VALUES[r1], RANK_VALUES[r2]].sort((a, b) => b - a);

    const draws = detectDrawsAndOuts(sampleCombo, validBoard);

    // 1. Monster Hands (Straight, Flush, Full House, Quads, Straight Flush)
    if (cat >= 4) {
      return {
        primaryAction: "3bet",
        raise: 85, call: 15, fold: 0,
        actionTitle: "Value Bet / Raise (85%) | Check-Call (15%)",
        advice: `Monster holding (${handName}). Bet/raise 66%-75% pot for value; occasionally check to trap.`,
      };
    }

    // 2. Three of a Kind (Sets)
    if (cat === 3) {
      return {
        primaryAction: "3bet",
        raise: 75, call: 25, fold: 0,
        actionTitle: "Value Bet (75%) | Check-Call (25%)",
        advice: `Strong Set (${handName}). Fast-play to build pot and charge drawing hands.`,
      };
    }

    // 3. Monster Combo Draws (12+ outs)
    if (draws.isMonster || draws.outs >= 12) {
      return {
        primaryAction: "raise",
        raise: 70, call: 30, fold: 0,
        actionTitle: `Semi-Bluff Raise (${draws.outs} Outs) | Call (30%)`,
        advice: `Monster Combo Draw (${draws.name}) with ${draws.outs} outs. Play with maximum aggression.`,
      };
    }

    // 4. Two Pair
    if (cat === 2) {
      return {
        primaryAction: "raise",
        raise: 65, call: 35, fold: 0,
        actionTitle: "Bet / Raise (65%) | Call (35%)",
        advice: `Two Pair (${handName}). Ahead of single pairs. Bet for value and protection.`,
      };
    }

    // 5. Strong Draws (8+ outs: OESD or Flush Draw)
    if (draws.outs >= 8) {
      return {
        primaryAction: "raise",
        raise: 55, call: 45, fold: 0,
        actionTitle: `Semi-Bluff Bet (55%) | Call (45%)`,
        advice: `High-equity draw (${draws.name}, ${draws.outs} outs). Excellent candidate to semi-bluff bet or call.`,
      };
    }

    // 6. One Pair
    if (cat === 1) {
      const pairRank = score[1];
      if (isPair && pairRank > highestBoard) {
        // Pocket Overpair
        return {
          primaryAction: "raise",
          raise: 60, call: 40, fold: 0,
          actionTitle: "C-Bet (60%) | Call (40%)",
          advice: `Pocket Overpair (${handName}). Continuation bet 40%-55% pot for value and protection.`,
        };
      } else if (pairRank === highestBoard) {
        // Top Pair
        const kicker = handVals[0] === pairRank ? handVals[1] : handVals[0];
        if (kicker >= 12) {
          return {
            primaryAction: "raise",
            raise: 55, call: 45, fold: 0,
            actionTitle: "Value Bet (55%) | Check-Call (45%)",
            advice: `Top pair with strong kicker. Bet for value against middle pairs, or check-call.`,
          };
        } else {
          return {
            primaryAction: "call",
            raise: 25, call: 65, fold: 10,
            actionTitle: "Check-Call (65%) | Bet (25%)",
            advice: `Top pair with weak kicker. Play pot-control via check-call.`,
          };
        }
      } else {
        // Middle / Underpair
        if (draws.outs >= 4) {
          return {
            primaryAction: "call",
            raise: 15, call: 70, fold: 15,
            actionTitle: "Check-Call / Draw (70%)",
            advice: `Middle pair with redraw (${draws.name}). Check-call to see next street.`,
          };
        }
        return {
          primaryAction: "call",
          raise: 10, call: 55, fold: 35,
          actionTitle: "Check-Call (55%) | Fold to aggression (35%)",
          advice: `Marginal showdown value. Check to catch bluffs; fold if facing heavy betting.`,
        };
      }
    }

    // 7. Weak Draw (Gutshots, 4 outs)
    if (draws.outs >= 4) {
      return {
        primaryAction: "call",
        raise: 20, call: 50, fold: 30,
        actionTitle: "Float / Check-Call (50%) | Fold (30%)",
        advice: `${draws.name} (${draws.outs} outs). Check to see cheap cards; fold to large bets without pot odds.`,
      };
    }

    // 8. Air / Trash
    return {
      primaryAction: "fold",
      raise: 5, call: 10, fold: 85,
      actionTitle: "Fold to Bet (85%) | Check-Giveup",
      advice: `Unimproved holding with minimal equity on this board texture. Disciplined check-fold.`,
    };
  }

  // Export module to global window
  root.PokerEvaluator = {
    RANKS,
    RANK_VALUES,
    SUITS,
    NICKNAMES,
    EQUITY_MAP,
    evaluateHandRank,
    compareHandScores,
    detectDrawsAndOuts,
    calculateHeroEquity,
    calculateBluffMetrics,
    evaluateHandOnBoard,
  };
})(typeof window !== "undefined" ? window : this);
