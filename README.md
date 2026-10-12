# SUMMIT

A modular personal expedition journal built with React, strict TypeScript, Vite, Tailwind CSS, Recharts, and Lucide. No backend, account, calorie counting, or paid services.

## Develop

Use Node.js 24 (see `.node-version`).

```sh
npm ci
npm run dev
```

Open the Vite development address with the `/summit/` path. The entrance leads to the journal; the mountain image is bundled and requires no remote image service. Operation Winter Summit seeds once in an empty browser: October 12, 2026–January 10, 2027, with a January 9–10 mission weekend and 13 training weeks. The cover is an atmospheric alpine photograph, not a representation of Mount Washington.

Habits and sessions are adjustable. Recovery and training fuel come first. The 225 → 200 lb goal is optional and never used as a mission-success gate. Starting weight is a reference, not an invented observation.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Browser acceptance tests:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser tests use system Chromium when available, or Playwright's installed Chromium otherwise. Set `CHROMIUM_PATH` for a custom executable. They start Vite automatically and cover entrance navigation, persisted checkoffs, measurement CRUD, training completion/skipping, a second mission, habits, export/import, corrupt-storage recovery, and a mobile viewport. Unit tests cover calendar arithmetic, countdowns, habit schedules, 13-week training generation, observation ordering/trends, version handling, malformed imports, and backup failures.

For a production smoke check run `npm exec vite -- preview --host 0.0.0.0` after building and open the `/summit/` path.

## Deployment

Vite uses `/summit/` as its base path. For a renamed repository or custom domain, change `base` in `vite.config.ts`.

1. Commit the project and push to `main` on `zachlepore/summit`.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. The workflow installs the locked dependencies, runs lint, TypeScript, unit and browser tests, builds, uploads `dist`, and deploys Pages. Pull requests validate without deploying.

Repository permissions or organization policies may require enabling Actions and Pages. A configured workflow is not evidence of a live deployment; this implementation does not push or publish on your behalf.

## Architecture

- `src/domain`: stable-ID models and React-independent calendar, schedule, habit, and trend functions.
- `src/data`: mission seed, repository interface, schema validation, version boundary, and browser-storage adapter.
- `src/features`: mission configuration forms, observation charts, training views, and timeline modules.
- `src/components`: shared accessible form/dialog controls.
- `src/app`: application state and views; all writes go through the repository.
- `src/styles`: responsive expedition visual system.

Mission definitions contain habits, measurement definitions, outcomes, and checkpoints. Recorded entries and sessions are stored separately and linked by stable IDs. A second mission is created through settings, with an optional movement-plan template or standalone sessions. Dates use ISO calendar strings; UTC-noon arithmetic avoids DST drift, while daily logging uses the user's local calendar date. Countdowns are calendar-day counts: October 12 to January 10 is 90 days; the inclusive schedule contains 91 dates across 13 weeks.

Changing a mission's dates preserves existing training sessions and their logs rather than silently rewriting the plan. Individual sessions remain editable. Weekly habits have one chosen check-in day. Measurement definitions can be added and renamed; unit edits relabel existing values and do not perform conversions. Create a separate definition for a different unit.

## Data and backups

Data is stored in this browser at this site's origin under `summit.store`, in schema version 1. There is no device sync. Private browsing, storage eviction, clearing site data, or changing the deployment origin can make logs unavailable. Export JSON regularly and before switching devices.

Settings provide export, validated import with replacement confirmation, and confirmed reset. Import checks every required model, calendar date, enum, numeric value, ID uniqueness, daily-entry uniqueness, and cross-record references. Import and reset retain the previous raw value under `summit.store.backup` before replacing it; a backup write failure stops replacement. This local recovery copy is not a substitute for an external export and only retains the previous replacement.

Corrupt or unsupported saved data opens a recovery screen instead of seeding over it. Export there preserves the original raw content, including invalid data. Future schema migrations belong in `migrate`: add explicit, tested version-to-version transforms. Unknown versions are rejected, not guessed or silently discarded. Version 1 is the first release and requires no legacy conversion.

Charts plot only recorded observations. The seven-day trend averages available observations in the trailing seven calendar days and requires at least three entries; missing days are not imputed. Mileage includes completed sessions with actual distances only; unrecorded weeks remain gaps.

## Next phase

Start with user trials and accessible/mobile usability refinement, then add editable recurring training templates and richer mission outcomes. For future Supabase integration, implement the repository interface behind the data layer, introducing asynchronous operations and explicit conflict handling at that boundary. Add authentication, synchronization, notification preferences, Garmin import, and external integrations only when that phase is authorized.

## Image attribution

The bundled alpine cover comes from the [Next.js image-component example](https://github.com/vercel/next.js/blob/canary/examples/image-component/public/mountains.jpg). Next.js is MIT licensed; see `public/images/NOTICE.txt`. Users may configure their own cover per mission.
