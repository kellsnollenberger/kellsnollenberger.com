# Personal website

Live domain: kellsnollenberger.com. GitHub Pages publishes the repository's `main` branch from its root. The homepage is the existing static `index.html` with its assets, script, and stylesheet.

## Threes simulator
- Added 2026-09-20 at `/threes/`, unlinked from the homepage and marked `noindex, nofollow` as requested. This is an unlisted public page, not password-protected.
- Self-contained static game files live in `threes/`; relative asset references support the directory route.
- Threes score zero; lowest total wins. Previous winner leads each regular round. Busts stop losing turns early. Only tied players re-ante; their order reverses for each playoff, including multiway ties. The pot carries until one player wins.
- Strategy lens distinguishes current-pass wins and playoff ties. It forecasts unplayed opponents, so future-seat probabilities are estimates. It does not model eventual playoff outcomes or all future ante costs.
- Keep the simulator out of homepage navigation and sitemaps. Preserve the root `CNAME` and existing homepage when updating the game.

- Added Score → win odds: live-table and first-to-roll scenarios, 2–5 players, conditional outcomes for scores 0–30, and 50/75/90% outright-win targets. Uses the existing independent minimum-mean opponent forecast, explicitly labeled as an estimate; playoff ties are separate from outright wins. Verified probability sums, monotonicity, known-score thresholds, controls, and game regressions.
