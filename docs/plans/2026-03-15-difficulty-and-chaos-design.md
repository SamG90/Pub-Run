# Pub Run: Difficulty & Chaos Update

## Overview

Add two difficulty modes (Normal / Hard), five progressive chaos tiers with new mechanics, tier-appropriate music (Halo + Mario), and leaderboard enhancements to drive competition.

## Difficulty Modes

Two modes, selectable on the start screen:

| | Normal | Hard |
|---|---|---|
| Starting lives | 3 | 1 |
| Life earn method | +1 every 100 steps | Beer pickups ONLY |
| Max lives | 5 | 3 |
| Obstacle speed scaling | +6% per tier | +10% per tier |
| Spawn rate ceiling | 85% | 95% |
| Chaos mechanics | Introduced at listed tier | Introduced one tier earlier |
| FOV narrowing | +5% per tier | +8% per tier |

Start screen shows two buttons side by side — "NORMAL" and "HARD". Hard gets menacing visual treatment (red/flame accent). Selected difficulty stored and shown on leaderboard as a badge (skull icon for Hard).

## Chaos Tiers

Five tiers, each introducing a new mechanic:

| Tier | Steps | Name | New Mechanic |
|---|---|---|---|
| 1 | 0-199 | "Leaving the House" | Vanilla — current gameplay |
| 2 | 200-399 | "Crossing the Road" | Moving obstacles — some drift sideways between lanes |
| 3 | 400-599 | "Dodging Traffic" | Lane walls — 3-4 lanes blocked simultaneously, tight gaps |
| 4 | 600-799 | "Getting Loose" | Drunk swerve — random involuntary lane shift, brief warning flash |
| 5 | 800-1000 | "The Final Stretch" | Blackouts — screen goes dark 1-2 seconds periodically, all previous mechanics active |

On Hard mode, each mechanic kicks in one tier earlier (moving obstacles from step 0, lane walls at 200, drunk swerve at 400, blackouts at 600, tier 5 is all mechanics at max intensity).

Tier announcements: big text overlay flashes the tier name on entry.

Existing scaling (FOV, speed, spawn rate) continues to ramp on top of tier mechanics.

## Music & Audio

### Start/Loading Screen
- Halo theme (Gregorian chant intro), looping

### In-Game Music by Tier

| Tier | Steps | Music | Vibe |
|---|---|---|---|
| 1 | 0-199 | Super Mario overworld theme | Bouncy, casual |
| 2 | 200-399 | Mario underground theme | Tension building |
| 3 | 400-599 | Mario star power / speed-up theme | Frantic energy |
| 4 | 600-799 | Halo "Rock Anthem for Saving the World" | Epic, high stakes |
| 5 | 800-1000 | Halo Mjolnir Mix / intense combat | Full send, final stretch |

### Audio Details
- Crossfade between tracks over ~2 seconds on tier change, timed with tier announcement
- Game over: record scratch / sad trombone, then silence
- Win: Halo victory fanfare
- Bundle MP3 files as static assets, play via Web Audio API (existing SoundSynth infrastructure)
- Existing SFX (step, dodge, crash) play on top at higher priority
- Music at ~40% volume by default, no volume control UI

## Leaderboard Changes

- Skull icon (💀) badge next to Hard mode scores
- New "Tier Reached" column showing the highest tier name achieved
- Sort order unchanged: highest score first
- Single unified leaderboard for both difficulties

## Beer Pickups

- Normal: 3% spawn rate (unchanged)
- Hard: 5% spawn rate (slightly more generous since it's the only healing)
- Hard max lives: 3
- Spawn behavior unchanged (obstacle-free lanes only)

## Not Changing

- 1000-step target
- Core tap mechanics
- Existing SFX
- Admin panel
