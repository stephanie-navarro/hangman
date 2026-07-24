# Hangman — Scavenger Hunt

A simple browser hangman game for a scavenger hunt. The secret word is loaded at runtime from puzzle data.

## Play locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy to GitHub Pages

1. Push this repo to GitHub (`stephanie-navarro/hangman`).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose branch `main` and folder `/ (root)`, then save.
5. After a minute, the site will be live at:

   `https://stephanie-navarro.github.io/hangman/`

No build step required — static HTML, CSS, and JavaScript only.

## Files

| File        | Purpose              |
| ----------- | -------------------- |
| `index.html` | Game layout          |
| `style.css`  | Styling              |
| `game.js`    | Hangman game logic   |
