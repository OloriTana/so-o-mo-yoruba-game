# Márùn-ún Márùn-ún — Yoruba Trivia Game

A shared-device Yoruba trivia game for 2–4 teams.

## What's included

- `index.html` — game structure
- `style.css` — indigo/adìrẹ-inspired visual design
- `script.js` — game mechanics, scoring, random question selection and timer
- `questions.json` — 100 questions from the supplied CSV
- `README.md` — these instructions

## Game rules implemented

- Choose 2, 3 or 4 teams.
- Choose 3, 5, 7, 10 or 15 turns per team.
- Each turn randomly draws one unused question from the full question pool.
- A question is removed from the pool once drawn; other questions from the same source card remain available.
- Questions do not repeat within a game. Starting a new game resets the pool.
- Each team self-assesses and enters a score from 0 to 5.
- The scoreboard updates after every turn.
- The game ends when all teams have completed their selected turns.
- Sound is optional and switched off by default. When enabled, gentle cues play during the final 10 seconds and a soft two-tone alarm plays at zero.

## Run locally

Because the game loads `questions.json` using `fetch()`, do not open `index.html` by double-clicking it.

If Python is installed:
1. Open a terminal in this folder.
2. Run `python -m http.server 8000`
3. Open `http://localhost:8000` in your browser.

## Update your existing GitHub Pages site

1. Open your existing GitHub repository.
2. Replace the old `index.html`, `style.css`, `script.js`, and `questions.json` with these versions. You can also replace `README.md`.
3. Commit the changes to the `main` branch.
4. Keep GitHub Pages configured to deploy from `main` and `/(root)`.
5. Wait a few minutes, then refresh your published game URL. If the old version appears, hard-refresh the page or open it in a private/incognito window.

## Notes

- This is a static browser game for one shared device; it does not require accounts or a server-side database.
- The browser's Web Audio support is used for optional sound cues. Some browsers may require a user interaction before audio can play.
- The Google Fonts connection is optional; fallback fonts are specified in the stylesheet.
- The tie-breaker is a simple extra round for tied teams. It is intended as a lightweight game feature, not a tournament engine.
