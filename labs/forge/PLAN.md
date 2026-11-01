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
5. Party mode (drive 5), share cards.
