# Personal website

Live domain: kellsnollenberger.com. GitHub Pages publishes the repository's `main` branch from its root. The homepage is the existing static `index.html` with its assets, script, and stylesheet.

## Threes simulator
- Added 2026-09-20 at `/threes/`, unlinked from the homepage and marked `noindex, nofollow` as requested. This is an unlisted public page, not password-protected.
- Self-contained static game files live in `threes/`; relative asset references support the directory route.
- Threes score zero; lowest total wins. Previous winner leads each regular round. Busts stop losing turns early. Only tied players re-ante; their order reverses for each playoff, including multiway ties. The pot carries until one player wins.
- Strategy lens ranks current holds by modeled net round profit, including reversed/multiway/repeated playoffs, pot growth, and extra antes. Opponents use the real computer policy; future playoff turns assume that same policy for everyone, including the human, with sufficient funds to re-ante. This is model-based advice, not a globally optimal strategy. Immediate wins, playoff entry, eventual wins, conditional playoff-win chance, extra antes, and net EV are shown.
- Keep the simulator out of homepage navigation and sitemaps. Preserve the root `CNAME` and existing homepage when updating the game.

- Added Score → win odds: live-table and first-to-roll scenarios, 2–5 players, conditional outcomes for scores 0–30, and 50/75/90% outright-win targets. Uses the existing independent minimum-mean opponent forecast, explicitly labeled as an estimate; playoff ties are separate from outright wins. Verified probability sums, monotonicity, known-score thresholds, controls, and game regressions.

- Matched simulator styling to the main website: Cairo headings, IBM Plex Mono text, dark brown background, cream text, copper accents, square panels. Strategy advice is shown automatically on rolls; score-to-odds section opens by default. Hide/reveal remains available. Asset version query avoids stale styling after this update.

- Game branding is now simply “Threes.” Score-to-odds also uses the playoff model. Current human-turn continuations optimize EV; later playoff turns are a fixed-policy forecast.

- User terminology: a tie is a push; consecutive ties are a double push, triple push, etc. Every push charges only the remaining tied players another full ante and reverses their order. At $5, contributions progress $5 → $10 → $15. Seats now show total contributions; push confirmation shows each new total and the next pot. Eliminated players’ money stays in the pot.

- Added automatic “Your round chances” between turns: actual posted score and known results determine outright-win, push, loss, eventual-win, and net-profit forecasts. Updates before each remaining player acts, including pushes and busts. Before the human has played, the forecast explicitly assumes the computer policy. Verified against conditional score odds and all initial seat positions with 2–5 players, plus game and rendered UI regressions.

- Bust screens now retain the actual last roll as non-interactive dice for both the human and computers until Continue is pressed. Verified forced human/computer bust displays and game regressions.
