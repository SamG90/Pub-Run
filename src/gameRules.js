export const DIFFICULTIES = {
  normal: {
    id: 'normal',
    label: 'NORMAL',
    startingLives: 3,
    maxLives: 5,
    lifeGainEverySteps: 100, // +1 life every 100 steps
    lifeGainFromSteps: true, // whether step milestones grant lives
    beerPickupSpawnChance: 0.03,
    fovPerTier: 0.05, // +5% zoom per 100-step tier
    speedPerTier: 0.06, // +6% obstacle speed per tier
    spawnRateBase: 0.65,
    spawnRateCeiling: 0.85,
    spawnRatePerTier: 0.025,
    chaosTierOffset: 0, // chaos mechanics appear at their listed tier
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    startingLives: 1,
    maxLives: 3,
    lifeGainEverySteps: 0, // no step-based life gain
    lifeGainFromSteps: false, // lives ONLY from beer pickups
    beerPickupSpawnChance: 0.05, // slightly more generous
    fovPerTier: 0.08, // +8% zoom per tier
    speedPerTier: 0.10, // +10% obstacle speed per tier
    spawnRateBase: 0.65,
    spawnRateCeiling: 0.95,
    spawnRatePerTier: 0.035,
    chaosTierOffset: 1, // chaos mechanics appear one tier earlier
  },
};

export const CHAOS_TIERS = [
  { tier: 1, startStep: 0,   name: 'Leaving the House',  mechanic: null },
  { tier: 2, startStep: 200, name: 'Crossing the Road',  mechanic: 'movingObstacles' },
  { tier: 3, startStep: 400, name: 'Dodging Traffic',     mechanic: 'laneWalls' },
  { tier: 4, startStep: 600, name: 'Getting Loose',       mechanic: 'drunkSwerve' },
  { tier: 5, startStep: 800, name: 'The Final Stretch',   mechanic: 'blackouts' },
];

// Get the current chaos tier for a given score
export const getChaosTier = (score) => {
  for (let i = CHAOS_TIERS.length - 1; i >= 0; i--) {
    if (score >= CHAOS_TIERS[i].startStep) return CHAOS_TIERS[i];
  }
  return CHAOS_TIERS[0];
};

// Get the tier name reached (for leaderboard display)
export const getTierName = (score) => {
  return getChaosTier(score).name;
};

// Check which chaos mechanics are active at a given score for a difficulty
export const getActiveMechanics = (score, difficulty) => {
  const offset = difficulty.chaosTierOffset;
  const active = {
    movingObstacles: false,
    laneWalls: false,
    drunkSwerve: false,
    blackouts: false,
  };

  for (const tier of CHAOS_TIERS) {
    if (tier.mechanic === null) continue;
    // With offset, mechanics activate earlier (offset tiers * 200 steps earlier)
    const activationStep = Math.max(0, tier.startStep - offset * 200);
    if (score >= activationStep) {
      active[tier.mechanic] = true;
    }
  }

  return active;
};

// Music tracks per tier (file paths in /public/music/)
export const TIER_MUSIC = [
  { tier: 1, track: '/music/mario-overworld.mp3',     label: 'Super Mario Overworld' },
  { tier: 2, track: '/music/mario-underground.mp3',    label: 'Mario Underground' },
  { tier: 3, track: '/music/mario-star.mp3',           label: 'Mario Star Power' },
  { tier: 4, track: '/music/halo-rock-anthem.mp3',     label: 'Halo Rock Anthem' },
  { tier: 5, track: '/music/halo-mjolnir.mp3',         label: 'Halo Mjolnir Mix' },
];

export const START_MUSIC = '/music/halo-theme.mp3';
export const GAMEOVER_SOUND = '/music/sad-trombone.mp3';
export const WIN_SOUND = '/music/halo-victory.mp3';

export const GAME_RULES = {
  targetSteps: 1000,
  highScoreWarningDistance: 15,
};

export const OBSTACLE_LABELS = [
  'Car',
  'Taxi',
  'Ute',
  'Kebab Stand',
  '7-Eleven',
  'Bottle Shop',
  'KFC',
  'Burger Bar',
  'Lawn Mower',
];
