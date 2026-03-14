import React from 'react';
import './HowToPlayCard.css';

const obstacleList = [
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

function HowToPlayCard() {
  return (
    <div className="instruction-card" aria-label="How to play">
      <h2>📘 How to Play</h2>
      <p>
        <strong>Target:</strong> Reach <strong>1000 steps</strong> to arrive at <strong>The Coomera Lodge</strong> and win.
      </p>

      <h3>🎮 Controls</h3>
      <ul>
        <li><strong>Tap middle third:</strong> Move forward and gain <strong>+1 step</strong>.</li>
        <li><strong>Tap left / right third:</strong> Change lanes to dodge obstacles.</li>
        <li><strong>Only middle taps increase score:</strong> Dodging does not add steps.</li>
      </ul>

      <h3>🚧 Obstacles (all current types)</h3>
      <p>{obstacleList.join(', ')}.</p>

      <h3>🍺 Lives, perks & milestones</h3>
      <ul>
        <li><strong>Start:</strong> You begin with <strong>1 life</strong>.</li>
        <li><strong>Life gain:</strong> Every <strong>50 steps</strong>, gain +1 life (max <strong>5</strong>).</li>
        <li><strong>Collision:</strong> If you have a life, you lose 1 and that obstacle is cleared.</li>
        <li><strong>Game over:</strong> If you are on 0 lives, the next collision ends the run.</li>
        <li><strong>Milestones:</strong> 100 = Beer, 200 = Pint, 300 = Spirit, then shoutouts every 100 up to 900.</li>
        <li><strong>Pressure alerts:</strong> Warning/hype triggers when you are within 15 of the all-time high score.</li>
      </ul>
    </div>
  );
}

export default HowToPlayCard;
