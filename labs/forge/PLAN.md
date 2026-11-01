# Forge: build plan

A game layer for health and fitness, built on a fork of [openGym](https://github.com/DuarteSantos8/openGym).
`index.html` here is the clickable prototype, running on sample data.

## Why openGym

- React 19 + Vite, Capacitor apps for Android and iPhone, self-hosted, your data stays yours.
- Already logs workouts, sets, PRs, muscle volume, weigh-ins and body measurements.
- Already talks to **Health Connect** (writes workouts and weight, reads heart rate and weight).
  Samsung Health syncs into Health Connect, so Health Connect is the one hub for everything.
- License is **AGPL-3.0**. Fine for personal use. If we ever host it for other people, the source of
  our changes has to be public too.

## Data in

| Source | Data | Route | Work |
|---|---|---|---|
| openGym | workouts, sets, PRs, muscle volume, weigh-ins | built in | none |
| Samsung Health | steps, sleep, resting HR, HRV, active kcal | Health Connect | add read permissions + reader in `HealthConnectPlugin.java` / `lib/health-read.js` |
| Hume | weight, body fat, lean mass | Hume → Google Health → Health Connect | confirm Google Health shares body fat + lean mass in Health Connect |
| Lean 4 Life (coach's app) | food log, macros, workouts, check-ins | best: app writes `NutritionRecord` to Health Connect. Else export or API from the coach | v2.8.6 added health data reading; ask the coach if it can also write. Fallback: quick log in Forge |

## Game layer (new code in the fork)

- `src/lib/game/xp.js`: pure functions. State in, XP events out. Tested like the rest of `lib/`.
  - Hard set 10 XP, PR +50, steps 1 XP per 200 (cap 60), sleep 7–9 h 40 XP,
    protein hit 50, kcal in range 30, weigh-in 15, check-in 25.
- `src/lib/game/levels.js`: level curve `90 × L^1.55`, six stat levels, titles.
- `src/lib/game/quests.js`: daily quests from today's plan + Health Connect targets. Recovery (HP) picks difficulty.
- `src/lib/game/skills.js`: skill tree data + unlock rules. Skills change rules (XP bonuses, new quest types, freezes).
- `src/lib/game/boss.js`: weekly boss, HP 2,000, heals 5% per missed day.
- `src/views/Character.jsx`: character sheet + physique hologram (reuses openGym's `BodyMap` volume data).
- Game state goes in the Zustand store next to `workouts`, so it syncs and backs up with everything else.

## 3D body scan and forecast

Built on the Vault-It 3D engine approach: dependency-free WebGL, instanced bricks, orbit camera,
bricks laid bottom to top. The prototype's Body tab shows it with a hand-tuned body shape.

**Accuracy, honestly.** Girths and shape: 97–99% is reachable (±1–2 cm). Body fat %: ±2–3 points,
nothing gets to 99% (DEXA is ±1–2). Forecast: a range that narrows each scan.

Pipeline in the app:
1. **Capture.** Guided 4 angles (front, left, back, right) with the Capacitor camera. On-device
   checks before the shot: MediaPipe Pose for A-pose and distance, accelerometer for phone tilt.
2. **Silhouettes.** MediaPipe segmentation per photo. Photos never leave the phone or your server.
3. **Fit.** A parametric body model fitted to the 4 silhouettes + keypoints, pinned by your height
   and constrained so volume × body density matches Hume weight and body fat.
   - Model license matters: SMPL / SMPL-X are research-only. Check NAVER's Anny model
     (reported as Apache-2.0) before choosing. Run the fit in a sidecar next to the openGym api.
   - Shortcut: a paid scan SDK (Bodygram, 3DLOOK, Prism) if we want accuracy before building our own.
4. **Prove it.** Monthly tape measurements (openGym already logs body measurements) are ground
   truth. Every scan shows its error against the last tape check, so "99%" is measured, not claimed.
5. **Forecast.** Weekly energy-balance model (Hall: fat 9,440 kcal/kg, lean 1,816 kcal/kg, metabolic
   adaptation ~22 kcal/day per kg lost) with Forbes partition shifted by training, protein and sleep.
   Inputs are your real habit hit-rates from quests. Fat and lean mass changes are mapped onto the
   body model's shape space, so the 3D body morphs. Re-fit the coefficients to your own scans over time.

## Octalysis

Strong on drives 2, 3, 4, 7. Weakest on 5 (social): a two-person party with a training partner is the fix.
Drive 8 (loss) is kept light on purpose. See the Design tab in the prototype.

## Guardrails

No XP for big calorie deficits. Rest and sleep are quests. Low recovery lowers difficulty. Levels are never taken away.

## Milestones

1. Fork openGym, run it, import existing history.
2. Health Connect reads: steps, sleep, nutrition, body fat, lean mass.
3. Game lib + tests, character sheet view.
4. Quests, boss, skill tree in the app.
5. Body tab: brick renderer + forecast, then guided capture and the model fit.
6. Party mode (drive 5), share cards.
