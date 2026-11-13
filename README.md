# UnDebt

## Design and delivery

- [Production design (as-is on `main`)](docs/production.md)
- [Proposed design (current `dev`)](docs/dev.md)
- [Documentation home](docs/index.html)

`main` is production; `dev` is the proposed integration branch. Update `docs/dev.md` and `docs/dev.html` with each material application change (the Pages workflow checks for this), then open a reviewed `dev` → `main` PR. Update `docs/production.md` and `docs/production.html` in that PR to describe the release being promoted. Merging updates the production baseline. GitHub Pages currently publishes the static `docs/` pages from `dev` (`/docs` source); the workflow also validates docs and publishes on dev pushes. The Pages site does not host the Expo app or apply Supabase migrations.