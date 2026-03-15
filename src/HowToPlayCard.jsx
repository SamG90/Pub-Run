import React from 'react';
import './HowToPlayCard.css';
import { GAME_RULES, DIFFICULTIES, OBSTACLE_LABELS, CHAOS_TIERS } from './gameRules';

function HowToPlayCard() {
  const normal = DIFFICULTIES.normal;
  const hard = DIFFICULTIES.hard;

  return (
    <div className="instruction-card" aria-label="How to play">
      <h2>📘 How to Play</h2>
      <p>
        <strong>Target:</strong> Reach <strong>{GAME_RULES.targetSteps} steps</strong> to arrive at <strong>The Coomera Lodge</strong> and win.
      </p>

      <h3>🎮 Controls</h3>
      <ul>
        <li><strong>Tap middle third:</strong> Move forward and gain <strong>+1 step</strong>.</li>
        <li><strong>Tap left / right third:</strong> Change lanes to dodge obstacles.</li>
        <li><strong>Only middle taps increase score:</strong> Dodging does not add steps.</li>
      </ul>

      <h3>💀 Difficulty Modes</h3>
      <ul>
        <li>
          <strong>Normal:</strong> Start with {normal.startingLives} lives, earn +1 every {normal.lifeGainEverySteps} steps (max {normal.maxLives}). Chaos builds gradually.
        </li>
        <li>
          <strong>Hard:</strong> Start with {hard.startingLives} life, earn lives <strong>only from beer pickups</strong> (max {hard.maxLives}). Chaos hits earlier and harder. Skull badge on leaderboard.
        </li>
      </ul>

      <h3>⚡ Chaos Tiers</h3>
      <p>New challenges unlock as you progress:</p>
      <ul>
        {CHAOS_TIERS.map((tier, i) => {
          const nextTier = CHAOS_TIERS[i + 1];
          const range = nextTier ? `${tier.startStep}-${nextTier.startStep - 1}` : `${tier.startStep}+`;
          return (
            <li key={tier.tier}>
              <strong>{range}:</strong> {tier.mechanic ? (
                <>
                  {tier.name} — {tier.mechanic === 'movingObstacles' && 'obstacles drift between lanes.'}
                  {tier.mechanic === 'laneWalls' && 'lane walls block paths, find the gap.'}
                  {tier.mechanic === 'drunkSwerve' && 'drunk swerve randomly shifts your lane.'}
                  {tier.mechanic === 'blackouts' && 'blackouts turn the screen dark.'}
                </>
              ) : 'Vanilla — learn the ropes.'}
            </li>
          );
        })}
      </ul>
      <p style={{fontSize: '0.85rem', color: '#fbbf24'}}>
        On Hard mode, each mechanic activates {hard.chaosTierOffset * 200} steps earlier!
      </p>

      <h3>👁️ Vision Narrowing</h3>
      <p>
        As you enter higher tiers, your <strong>Vision Narrows</strong> (FOV zoom). This makes it harder to see obstacles until they are closer. Keep ya eyes peeled!
      </p>

      <h3>🚧 Obstacles</h3>
      <p>{OBSTACLE_LABELS.join(', ')}.</p>

      <h3>🍺 Lives & Pickups</h3>
      <ul>
        <li><strong>Collision:</strong> Lose 1 life, obstacle cleared. 0 lives = game over on next hit.</li>
        <li><strong>Beer pickups:</strong> Rare golden beers on off-centre lanes. Grab them for +1 life.</li>
        <li><strong>Milestones:</strong> 100 = Beer, 200 = Pint, 300 = Spirit, then shoutouts every 100.</li>
        <li><strong>Pressure alerts:</strong> Warning when within {GAME_RULES.highScoreWarningDistance} of the all-time high score.</li>
      </ul>
    </div>
  );
}

export default HowToPlayCard;
