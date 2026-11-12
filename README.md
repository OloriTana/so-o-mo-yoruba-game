# Ṣó O Mọ̀!
A single-device browser game built with HTML, CSS and JavaScript.

## Files
- `index.html` – game screens and content
- `style.css` – visual design and responsive layout
- `script.js` – game mechanics, timer, turn rotation and scoring
- `questions.json` – editable question deck imported from the supplied CSV

## Run locally
Because the game loads `questions.json`, open it through a local web server rather than double-clicking `index.html`.

If Python is installed, open a terminal in this folder and run:
`python3 -m http.server 8000`

Then visit `http://localhost:8000`.

## Publish with GitHub Pages
1. Create a new **public** GitHub repository, for example `so-o-mo-yoruba-game`.
2. Upload all four files (`index.html`, `style.css`, `script.js`, `questions.json`) to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then Save.
6. Wait for GitHub Pages to publish. The site link will appear in the Pages settings.

## Updating the questions
Edit `questions.json` and add another card object using the same five keys:
`id`, `indigo`, `goldenYellow`, `turquoise`, `brown`, `grey`.

Each card must have a unique `id`. Commit the updated file to GitHub; Pages will publish the updated deck.

## Game behaviour
- One shared device; no account or multiplayer backend.
- 2–6 teams, with editable team names.
- Six die outcomes: five question colours and WILD.
- One randomly selected unused card per turn.
- 30-second timer starts when the question is revealed. For WILD, it starts after the team chooses a question.
- Players self-judge answers and enter a score from 0–5.
- Deck is exhausted once each card has been used once.
- Scores and used-card tracking are held in the active browser session. Refreshing or closing the page starts a fresh game.
