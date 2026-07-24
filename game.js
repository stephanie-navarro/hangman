(function () {
  "use strict";

  const MAX_WRONG = 5;
  const COOLDOWN_SECONDS = 60;
  const LEXICON_URL = "data/lexicon.json";
  const COOLDOWN_STORAGE_KEY = "round-lock-until";

  const wordDisplay = document.getElementById("word-display");
  const statusMessage = document.getElementById("status-message");
  const keyboardEl = document.getElementById("keyboard");
  const gameBoard = document.getElementById("game-board");
  const newGameBtn = document.getElementById("new-game-btn");
  const winOverlay = document.getElementById("win-overlay");
  const winWordEl = document.getElementById("win-word");
  const cooldownOverlay = document.getElementById("cooldown-overlay");
  const timerDisplay = document.getElementById("timer-display");
  const closeWinBtn = document.getElementById("close-win-btn");
  const hangmanParts = document.querySelectorAll(".hangman-part");

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let roundGlyphs = "";
  let guessed = new Set();
  let wrongCount = 0;
  let gameOver = false;
  let onCooldown = false;
  let cooldownTimerId = null;
  let cooldownRemaining = 0;

  function readRoundKey() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--round-key");
    return parseInt(raw, 10) || 0;
  }

  function materializeGlyphs(entries, key) {
    return entries
      .map(function (code) {
        return String.fromCharCode(code + key);
      })
      .join("");
  }

  function loadRound() {
    return fetch(LEXICON_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("lexicon unavailable");
        }
        return response.json();
      })
      .then(function (payload) {
        roundGlyphs = materializeGlyphs(payload.glyphs, readRoundKey());
      });
  }

  function initKeyboard() {
    keyboardEl.innerHTML = "";
    ALPHABET.forEach(function (letter) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";
      btn.textContent = letter;
      btn.dataset.letter = letter;
      btn.addEventListener("click", function () {
        handleGuess(letter);
      });
      keyboardEl.appendChild(btn);
    });
  }

  function renderWord() {
    wordDisplay.innerHTML = "";
    roundGlyphs.split("").forEach(function (char) {
      const slot = document.createElement("span");
      slot.className = "letter-slot";
      const revealed = guessed.has(char);
      slot.textContent = revealed ? char : "";
      if (!revealed) {
        slot.classList.add("empty");
        slot.setAttribute("aria-hidden", "true");
      }
      wordDisplay.appendChild(slot);
    });
  }

  function updateHangman() {
    hangmanParts.forEach(function (part, index) {
      part.classList.toggle("visible", index < wrongCount);
    });
  }

  function updateKeyboard() {
    const locked = gameOver || onCooldown;
    keyboardEl.querySelectorAll(".key").forEach(function (btn) {
      const letter = btn.dataset.letter;
      btn.disabled = locked || guessed.has(letter);

      btn.classList.remove("key--correct", "key--wrong");
      if (guessed.has(letter)) {
        btn.classList.add(roundGlyphs.includes(letter) ? "key--correct" : "key--wrong");
      }
    });
  }

  function isWin() {
    return roundGlyphs.split("").every(function (char) {
      return guessed.has(char);
    });
  }

  function setStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.classList.remove("status--win", "status--lose");
    if (type) {
      statusMessage.classList.add("status--" + type);
    }
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ":" + String(seconds).padStart(2, "0");
  }

  function saveCooldownEnd() {
    sessionStorage.setItem(
      COOLDOWN_STORAGE_KEY,
      String(Date.now() + COOLDOWN_SECONDS * 1000)
    );
  }

  function clearCooldownEnd() {
    sessionStorage.removeItem(COOLDOWN_STORAGE_KEY);
  }

  function getCooldownRemainingSeconds() {
    const raw = sessionStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) {
      return 0;
    }

    const remaining = Math.ceil((parseInt(raw, 10) - Date.now()) / 1000);
    if (remaining <= 0) {
      clearCooldownEnd();
      return 0;
    }

    return remaining;
  }

  function enterCooldownState() {
    onCooldown = true;
    gameOver = true;
    cooldownRemaining = getCooldownRemainingSeconds();
    timerDisplay.textContent = formatTime(cooldownRemaining);
    cooldownOverlay.classList.remove("hidden");
    setBoardLocked(true);
    setStatus("Board locked. Wait for the cooldown.", "lose");
    updateKeyboard();

    if (cooldownTimerId) {
      clearInterval(cooldownTimerId);
    }
    cooldownTimerId = setInterval(tickCooldown, 1000);
  }

  function resumeCooldownIfNeeded() {
    if (getCooldownRemainingSeconds() <= 0) {
      return false;
    }

    enterCooldownState();
    return true;
  }

  function setBoardLocked(locked) {
    gameBoard.classList.toggle("game__board--locked", locked);
    newGameBtn.disabled = locked;
  }

  function tickCooldown() {
    cooldownRemaining = getCooldownRemainingSeconds();
    timerDisplay.textContent = formatTime(cooldownRemaining);

    if (cooldownRemaining <= 0) {
      clearInterval(cooldownTimerId);
      cooldownTimerId = null;
      onCooldown = false;
      cooldownOverlay.classList.add("hidden");
      setBoardLocked(false);
      resetRound();
    }
  }

  function startCooldown() {
    saveCooldownEnd();
    enterCooldownState();
  }

  function handleGuess(letter) {
    if (gameOver || onCooldown || guessed.has(letter) || !roundGlyphs) {
      return;
    }

    guessed.add(letter);

    if (!roundGlyphs.includes(letter)) {
      wrongCount += 1;
    }

    renderWord();
    updateHangman();
    updateKeyboard();

    if (isWin()) {
      gameOver = true;
      winWordEl.textContent = roundGlyphs;
      setStatus("You solved it!", "win");
      winOverlay.classList.remove("hidden");
      updateKeyboard();
      return;
    }

    if (wrongCount >= MAX_WRONG) {
      startCooldown();
      return;
    }

    const remaining = MAX_WRONG - wrongCount;
    setStatus(
      "Pick a letter. " + remaining + " wrong guess" + (remaining === 1 ? "" : "es") + " left."
    );
  }

  function resetRound() {
    guessed = new Set();
    wrongCount = 0;
    gameOver = false;
    winOverlay.classList.add("hidden");
    hangmanParts.forEach(function (part) {
      part.classList.remove("visible");
    });
    setStatus("Pick a letter.");
    renderWord();
    updateKeyboard();
  }

  function resetGame() {
    if (onCooldown) {
      return;
    }
    resetRound();
  }

  document.addEventListener("keydown", function (event) {
    const key = event.key.toUpperCase();
    if (key.length === 1 && key >= "A" && key <= "Z") {
      handleGuess(key);
    }
  });

  newGameBtn.addEventListener("click", resetGame);
  closeWinBtn.addEventListener("click", function () {
    winOverlay.classList.add("hidden");
    resetRound();
  });

  initKeyboard();

  loadRound()
    .then(function () {
      if (resumeCooldownIfNeeded()) {
        return;
      }
      resetRound();
    })
    .catch(function () {
      setStatus("Could not load puzzle data.", "lose");
      newGameBtn.disabled = true;
    });
})();
