# HomePoker Leaderboard & Training Hub

A static web leaderboard, analytics dashboard, and interactive training hub for casual home poker, blackjack, and baccarat nights, featuring a custom zero-sum multiplayer Elo rating engine.

**Live Demo:** [elysimp.github.io/HomePoker-Leaderboard](https://elysimp.github.io/HomePoker-Leaderboard/index.html)

## Features

- **Multiplayer Zero-Sum Elo Engine (`js/data.js`):** Chronologically evaluates `Texas Hold'em` sessions (`>= 2` players) using pairwise decomposition across 10 rank tiers (`Rookie` 100+ up to `Grandmaster` 1250+, starting at `400`, `baseK = 20`).
- **Anti-Inflation Rating Adjustments:** Weights head-to-head outcomes with table chip-spread gaps, per-round profit velocity, bust-rate penalties, a `+0.35` *Bust-Free Shield* for disciplined losing sessions, and marathon endurance bonuses (`rounds >= 35`).
- **Session & Chip Ledger:** Tracks buy-ins, final chip counts, net profit/loss, bust counts, round counts, and house rake across **23 sessions** (**421 rounds**, **15 unique players**).
- **Interactive Training Hub:** Includes a **Poker Range Lab** with GTO hand-evaluation feedback and a **Blackjack Strategy Trainer**.
- **Player Analytics & Theme Support:** Per-player career trend charts powered by **Chart.js v4** and persistent dark/light mode via `localStorage`.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js v4
- **Data Storage:** Static JSON (`data/players.json`, `data/poker_data.json`)
- **Hosting:** GitHub Pages

## Project Structure

```text
HomePoker-Leaderboard/
├── index.html             # Main leaderboard & session summary
├── player.html            # Individual player stats & Elo history
├── css/                   # Theme, training, and range-lab styles
├── js/                    # Elo engine, Chart.js views, GTO/Blackjack trainers
└── data/                  # Player profiles and session history JSONs
```

## Running Locally

Because the frontend fetches JSON files from `data/`, serve the directory with any local static HTTP server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/index.html`.
