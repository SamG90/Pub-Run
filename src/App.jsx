import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import './App.css';
import CanvasGame from './CanvasGame';
import SoundSynth from './SoundSynth';
import MusicPlayer from './MusicPlayer';
import Scoreboard from './Scoreboard';
import useDeviceIdentity from './useDeviceIdentity';
import { GAME_RULES, DIFFICULTIES, TIER_MUSIC, START_MUSIC, GAMEOVER_SOUND, WIN_SOUND, getTierName } from './gameRules';
import HowToPlayCard from './HowToPlayCard';

const WRONG_PASSWORD_MSGS = [
  "Nice try, ya drongo! 🦘",
  "Mate, that ain't it. Go have a Bundy. 🍺",
  "Strewth! Wrong password, cobber.",
  "Get outta here ya galah! 🐦",
  "Not even close, ya flamin' dropkick!",
  "Crikey! Did you just guess that? 🐊",
  "Yeah nah. Try again, legend.",
  "That password's about as useful as a screen door on a submarine.",
  "Mate you're dreamin'! 💤",
  "Stone the crows, that's wrong! 🪨",
  "Fair dinkum? That's ya best guess?",
  "Rack off with that password! 🚫",
];

const LEADERBOARD_PASSWORD = 'pubrun';

function App() {
  const [gameState, setGameState] = useState('START'); // START, PLAY, GAMEOVER, WIN, LEADERBOARD
  const [difficulty, setDifficulty] = useState('normal');
  const [score, setScore] = useState(0);
  const [milestone, setMilestone] = useState('');
  const [finalTime, setFinalTime] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [nameLocked, setNameLocked] = useState(true);
  const [leaderboardPassword, setLeaderboardPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [leaderboardUnlocked, setLeaderboardUnlocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [startTab, setStartTab] = useState('rules'); // rules, scores, setup
  const { deviceId, playerName, setPlayerName, isReturningPlayer } = useDeviceIdentity();
  const synthRef = useRef(null);
  const musicRef = useRef(null);

  const topScores = useQuery(api.scores.getTopScores);
  const personalHighScore = useQuery(api.scores.getPlayerTopScore, { deviceId }) || 0;
  const submitScore = useMutation(api.scores.submitScore);
  const suggestionsForReview = useQuery(
    api.scores.getSuggestionsForReview,
    leaderboardUnlocked ? {} : 'skip'
  );
  const updateScore = useMutation(api.scores.updateScore);
  const deleteScore = useMutation(api.scores.deleteScore);

  useEffect(() => {
    synthRef.current = new SoundSynth();
    musicRef.current = new MusicPlayer();
  }, []);

  // Play start screen music when on START
  useEffect(() => {
    if (gameState === 'START' && musicRef.current) {
      musicRef.current.init();
      musicRef.current.playTrack(START_MUSIC, { loop: true, volume: 0.35 });
    }
  }, [gameState]);

  const startGame = (selectedDifficulty) => {
    if (!playerName.trim()) return;
    const diff = selectedDifficulty || difficulty;
    setDifficulty(diff);
    if (synthRef.current) {
      synthRef.current.init();
      synthRef.current.enterGame();
    }
    if (musicRef.current) {
      musicRef.current.init();
      // Start with tier 1 music
      const tier1Track = TIER_MUSIC[0];
      if (tier1Track) {
        musicRef.current.playTrack(tier1Track.track, { loop: true, volume: 0.4, crossfadeDuration: 1 });
      }
    }
    setScore(0);
    setMilestone('');
    setScoreSubmitted(false);
    setGameState('PLAY');
  };

  const handleGameOver = async (finalScore, runTime) => {
    if (synthRef.current) synthRef.current.crash();
    if (musicRef.current) {
      musicRef.current.stop(0.3);
      musicRef.current.playOneShot(GAMEOVER_SOUND, 0.5);
    }
    setScore(finalScore);
    setGameState('GAMEOVER');
    if (playerName.trim() && !scoreSubmitted) {
      setScoreSubmitted(true);
      await submitScore({
        deviceId,
        playerName: playerName.trim(),
        score: finalScore,
        gameResult: 'gameover',
        runTime: runTime || 0,
        difficulty,
      });
    }
  };

  const handleWin = async (timeTakenSeconds) => {
    if (synthRef.current) synthRef.current.win();
    if (musicRef.current) {
      musicRef.current.stop(0.3);
      musicRef.current.playOneShot(WIN_SOUND, 0.6);
    }
    setFinalTime(timeTakenSeconds);
    setGameState('WIN');
    if (playerName.trim() && !scoreSubmitted) {
      setScoreSubmitted(true);
      await submitScore({
        deviceId,
        playerName: playerName.trim(),
        score: GAME_RULES.targetSteps,
        gameResult: 'win',
        runTime: timeTakenSeconds,
        difficulty,
      });
    }
  };

  const handleBeerHit = () => {
    if (synthRef.current) synthRef.current.beerHit();
  };

  const handleBeerPickup = () => {
    if (synthRef.current && typeof synthRef.current.beerPickup === 'function') {
      synthRef.current.beerPickup();
    }
  };

  const handleScoreUpdate = (newScore) => {
    setScore(newScore);
    if (synthRef.current) synthRef.current.step();

    // Milestones
    let msg = '';
    if (newScore === 100) msg = '🍺 YOU EARNED A BEER!';
    else if (newScore === 200) msg = '🍻 YOU EARNED A PINT!';
    else if (newScore === 300) msg = '🥃 YOU EARNED A SPIRIT!';
    else if (newScore % 100 === 0 && newScore > 300 && newScore < GAME_RULES.targetSteps) msg = `🔥 ${newScore} STEPS!`;

    if (msg) {
      if (synthRef.current) synthRef.current.milestone();
      setMilestone(msg);
      setTimeout(() => setMilestone(''), 2000);
    }
  };

  const handleTierChange = useCallback((tierNum, tierName) => {
    // Switch music to match the new tier
    if (musicRef.current && tierNum >= 1 && tierNum <= TIER_MUSIC.length) {
      const track = TIER_MUSIC[tierNum - 1];
      if (track) {
        musicRef.current.playTrack(track.track, { loop: true, volume: 0.4, crossfadeDuration: 2 });
      }
    }
  }, []);

  const handleDodge = () => {
    if (synthRef.current) synthRef.current.dodge();
  };

  const handleApproachingHighScore = useCallback(() => {
    if (synthRef.current) synthRef.current.approachingHighScore();
  }, []);

  const handleApproachingLife = useCallback(() => {
    if (synthRef.current) synthRef.current.approachingLife();
  }, []);

  const goToMainMenu = useCallback(() => {
    setLeaderboardPassword('');
    setPasswordError('');
    setLeaderboardUnlocked(false);
    setShowPasswordPrompt(false);
    setGameState('START');
  }, []);

  const handlePasswordSubmit = useCallback(() => {
    if (leaderboardPassword.trim().toLowerCase() === LEADERBOARD_PASSWORD) {
      setLeaderboardUnlocked(true);
      setShowPasswordPrompt(false);
      setPasswordError('');
    } else {
      const msg = WRONG_PASSWORD_MSGS[Math.floor(Math.random() * WRONG_PASSWORD_MSGS.length)];
      setPasswordError(msg);
      setLeaderboardPassword('');
    }
  }, [leaderboardPassword]);

  const formattedSuggestions = useMemo(() => {
    if (!suggestionsForReview) return null;

    return suggestionsForReview.map((suggestion) => ({
      ...suggestion,
      createdAtLabel: new Date(suggestion.createdAt).toLocaleString(),
    }));
  }, [suggestionsForReview]);

  return (
    <div className="app-container">
      {gameState === 'PLAY' && (
        <>
          {milestone && <div className="milestone-msg" key={milestone}>{milestone}</div>}
        </>
      )}

      <CanvasGame
        gameState={gameState}
        difficulty={difficulty}
        playerName={playerName}
        highScore={topScores && topScores.length > 0 ? topScores[0].score : 0}
        personalHighScore={personalHighScore}
        onGameOver={handleGameOver}
        onWin={handleWin}
        onScoreUpdate={handleScoreUpdate}
        onDodge={handleDodge}
        onBeerHit={handleBeerHit}
        onBeerPickup={handleBeerPickup}
        onApproachingHighScore={handleApproachingHighScore}
        onApproachingLife={handleApproachingLife}
        onTierChange={handleTierChange}
      />

      {gameState === 'START' && (
        <div className="screen start-screen">
          <div className="start-screen-content">
            <div className="start-header">
              <h1 className="title-flappy">PUB RUN</h1>
              <p className="start-tagline">
                Dodge hatchbacks, servos &amp; snag stands to reach <strong>The Coomera Lodge</strong> 🍺
              </p>
            </div>
            <div className="start-tabs">
              <button
                className={`tab-btn ${startTab === 'rules' ? 'active' : ''}`}
                onClick={() => setStartTab('rules')}
              >
                📖 RULES
              </button>
              <button
                className={`tab-btn ${startTab === 'scores' ? 'active' : ''}`}
                onClick={() => setStartTab('scores')}
              >
                🏆 SCORES
              </button>
              <button
                className={`tab-btn ${startTab === 'setup' ? 'active' : ''}`}
                onClick={() => setStartTab('setup')}
              >
                ⚙️ SETUP
              </button>
            </div>

            <div className="tab-content-area">
              {startTab === 'rules' && <HowToPlayCard />}

              {startTab === 'scores' && (
                <div className="home-leaderboard-section">
                  <Scoreboard
                    scores={topScores}
                    isAdmin={leaderboardUnlocked}
                    onUpdateScore={updateScore}
                    onDeleteScore={deleteScore}
                  />
                </div>
              )}

              {startTab === 'setup' && (
                <div className="home-leaderboard-section">
                  {!leaderboardUnlocked && !showPasswordPrompt && (
                    <button className="settings-toggle-btn" onClick={() => setShowPasswordPrompt(true)}>
                      ⚙️ Admin Settings
                    </button>
                  )}

                  {showPasswordPrompt && !leaderboardUnlocked && (
                    <div className="password-gate home-admin-gate">
                      <p className="password-prompt">🔒 Admin Access</p>
                      <div className="password-input-row">
                        <input
                          className="password-input"
                          type="password"
                          placeholder="Password"
                          value={leaderboardPassword}
                          onChange={(e) => setLeaderboardPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                          autoFocus
                        />
                        <button className="password-submit-btn" onClick={handlePasswordSubmit}>
                          🍺
                        </button>
                      </div>
                      <button className="password-cancel-btn" onClick={() => {
                        setShowPasswordPrompt(false);
                        setPasswordError('');
                        setLeaderboardPassword('');
                      }}>Cancel</button>
                      {passwordError && (
                        <p className="password-error" key={passwordError}>
                          {passwordError}
                        </p>
                      )}
                    </div>
                  )}

                  {leaderboardUnlocked && (
                    <>
                      <div className="admin-suggestions-panel">
                        <h3>💡 Suggestions for review</h3>
                        {!formattedSuggestions ? (
                          <p className="admin-suggestion-empty">Loading suggestions…</p>
                        ) : formattedSuggestions.length === 0 ? (
                          <p className="admin-suggestion-empty">No suggestions submitted yet.</p>
                        ) : (
                          <ul className="admin-suggestions-list">
                            {formattedSuggestions.map((suggestion) => (
                              <li className="admin-suggestion-item" key={suggestion._id}>
                                <p className="admin-suggestion-meta">
                                  <strong>{suggestion.playerName}</strong> · {suggestion.createdAtLabel}
                                </p>
                                <p className="admin-suggestion-message">{suggestion.message}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <button className="settings-toggle-btn" onClick={() => setLeaderboardUnlocked(false)}>
                        🔒 Lock Settings
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="start-screen-footer">
              <div className="name-input-row">
                <input
                  className="name-input"
                  type="text"
                  placeholder="Enter ya name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  readOnly={isReturningPlayer && nameLocked}
                  onKeyDown={(e) => e.key === 'Enter' && startGame('normal')}
                />
                {isReturningPlayer && nameLocked && (
                  <button
                    className="change-name-btn"
                    onClick={() => setNameLocked(false)}
                  >
                    ✏️
                  </button>
                )}
              </div>
              <div className="difficulty-buttons">
                <button
                  className="btn difficulty-btn difficulty-normal"
                  onClick={() => startGame('normal')}
                  disabled={!playerName.trim()}
                >
                  NORMAL
                </button>
                <button
                  className="btn difficulty-btn difficulty-hard"
                  onClick={() => startGame('hard')}
                  disabled={!playerName.trim()}
                >
                  💀 HARD
                </button>
              </div>

              <p className="controls-hint">
                MIDDLE to step · SIDE to dodge
              </p>

              <div className="credits">
                <p>Creative Consultant: <strong>Mr. Walker</strong> / Hard work: <strong>Mr. Graham</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="screen">
          <div className="screen-scroll-content">
            <h1 className="title" style={{backgroundImage: 'linear-gradient(135deg, #ef4444, #7f1d1d)'}}>SPLAT!</h1>
            <h2 className="subtitle">You got wiped out.</h2>
            <p style={{color: '#f8fafc', fontSize: '1.5rem', fontWeight: 'bold'}}>Steps: {score}</p>
            <p style={{color: '#94a3b8', fontSize: '0.9rem'}}>
              {difficulty === 'hard' ? '💀 Hard Mode' : 'Normal Mode'} · Reached: {getTierName(score)}
            </p>
            <Scoreboard scores={topScores} />
          </div>
          <div className="screen-sticky-buttons">
            <button className="btn" onClick={() => startGame(difficulty)}>Try Again</button>
            <button className="menu-btn" onClick={goToMainMenu}>🏠 Main Menu</button>
          </div>
        </div>
      )}

      {gameState === 'WIN' && (
        <div className="screen">
          <div className="screen-scroll-content">
            <h1 className="title" style={{backgroundImage: 'linear-gradient(135deg, #f59e0b, #fbbf24)'}}>🏆 THE BOSS 🏆</h1>
            <h2 className="subtitle">Welcome to The Coomera Lodge!</h2>
            <p style={{fontSize: '2.5rem', fontWeight: 900, color: '#fcd34d', margin: '1rem 0'}}>Time: {finalTime.toFixed(2)}s</p>
            <p style={{color: '#94a3b8', fontSize: '0.9rem'}}>
              {difficulty === 'hard' ? '💀 Hard Mode' : 'Normal Mode'}
            </p>
            <p>You survived {GAME_RULES.targetSteps} steps and are now the official Owner of the Pub.</p>
            <Scoreboard scores={topScores} />
          </div>
          <div className="screen-sticky-buttons">
            <button className="btn" onClick={() => startGame(difficulty)}>Defend Your Title</button>
            <button className="menu-btn" onClick={goToMainMenu}>🏠 Main Menu</button>
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
