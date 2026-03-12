import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import './App.css';
import CanvasGame from './CanvasGame';
import SoundSynth from './SoundSynth';
import Scoreboard from './Scoreboard';
import useDeviceIdentity from './useDeviceIdentity';

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
  const [score, setScore] = useState(0);
  const [milestone, setMilestone] = useState('');
  const [finalTime, setFinalTime] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [nameLocked, setNameLocked] = useState(true);
  const [leaderboardPassword, setLeaderboardPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [leaderboardUnlocked, setLeaderboardUnlocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState('');
  const { deviceId, playerName, setPlayerName, isReturningPlayer } = useDeviceIdentity();
  const synthRef = useRef(null);

  const topScores = useQuery(api.scores.getTopScores);
  const personalHighScore = useQuery(api.scores.getPlayerTopScore, { deviceId }) || 0;
  const submitScore = useMutation(api.scores.submitScore);
  const submitSuggestion = useMutation(api.scores.submitSuggestion);
  const updateScore = useMutation(api.scores.updateScore);
  const deleteScore = useMutation(api.scores.deleteScore);

  useEffect(() => {
    synthRef.current = new SoundSynth();
  }, []);

  const startGame = () => {
    if (!playerName.trim()) return;
    if (synthRef.current) {
      synthRef.current.init();
      synthRef.current.enterGame();
    }
    setScore(0);
    setMilestone('');
    setScoreSubmitted(false);
    setGameState('PLAY');
  };

  const handleGameOver = async (finalScore, runTime) => {
    if (synthRef.current) synthRef.current.crash();
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
      });
    }
  };

  const handleWin = async (timeTakenSeconds) => {
    if (synthRef.current) synthRef.current.win();
    setFinalTime(timeTakenSeconds);
    setGameState('WIN');
    if (playerName.trim() && !scoreSubmitted) {
      setScoreSubmitted(true);
      await submitScore({
        deviceId,
        playerName: playerName.trim(),
        score: 1000,
        gameResult: 'win',
        runTime: timeTakenSeconds,
      });
    }
  };

  const handleBeerHit = () => {
    if (synthRef.current) synthRef.current.beerHit();
  };

  const handleScoreUpdate = (newScore) => {
    setScore(newScore);
    if (synthRef.current) synthRef.current.step();

    // Milestones
    let msg = '';
    if (newScore === 100) msg = '🍺 YOU EARNED A BEER!';
    else if (newScore === 200) msg = '🍻 YOU EARNED A PINT!';
    else if (newScore === 300) msg = '🥃 YOU EARNED A SPIRIT!';
    else if (newScore % 100 === 0 && newScore > 300 && newScore < 1000) msg = `🔥 ${newScore} STEPS!`;

    if (msg) {
      if (synthRef.current) synthRef.current.milestone();
      setMilestone(msg);
      setTimeout(() => setMilestone(''), 2000);
    }
  };

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

  const handleSuggestionSubmit = async () => {
    const trimmedName = playerName.trim();
    const trimmedSuggestion = suggestionText.trim();

    if (!trimmedName) {
      setSuggestionStatus('Add your name before sending a suggestion.');
      return;
    }

    if (!trimmedSuggestion) {
      setSuggestionStatus('Suggestion cannot be empty.');
      return;
    }

    try {
      await submitSuggestion({
        deviceId,
        playerName: trimmedName,
        message: trimmedSuggestion,
      });
      setSuggestionText('');
      setSuggestionStatus('Thanks legend! Suggestion sent 🍻');
    } catch {
      setSuggestionStatus('Could not send suggestion right now. Try again soon.');
    }
  };

  return (
    <div className="app-container">
      {gameState === 'PLAY' && (
        <>
          {milestone && <div className="milestone-msg" key={milestone}>{milestone}</div>}
        </>
      )}

      <CanvasGame
        gameState={gameState}
        playerName={playerName}
        highScore={topScores && topScores.length > 0 ? topScores[0].score : 0}
        personalHighScore={personalHighScore}
        onGameOver={handleGameOver}
        onWin={handleWin}
        onScoreUpdate={handleScoreUpdate}
        onDodge={handleDodge}
        onBeerHit={handleBeerHit}
        onApproachingHighScore={handleApproachingHighScore}
        onApproachingLife={handleApproachingLife}
      />

      {gameState === 'START' && (
        <div className="screen start-screen">
          <div className="start-screen-content">
            <h1 className="title-flappy">PUB RUN</h1>
            <p className="start-tagline">
              Dodge hatchbacks, servos &amp; snag stands to reach <strong>The Coomera Lodge</strong> 🍺
            </p>
            <div className="name-input-row">
              <input
                className="name-input"
                type="text"
                placeholder="Enter ya name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                readOnly={isReturningPlayer && nameLocked}
                onKeyDown={(e) => e.key === 'Enter' && startGame()}
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
            <button className="btn" onClick={startGame} disabled={!playerName.trim()} style={{marginBottom: '1rem'}}>
              TAP TO PLAY
            </button>

            <button
              className="settings-toggle-btn suggestions-toggle-btn"
              onClick={() => {
                setShowSuggestionForm((prev) => !prev);
                setSuggestionStatus('');
              }}
            >
              💡 Suggestions
            </button>

            {showSuggestionForm && (
              <div className="suggestion-panel">
                <p className="suggestion-title">Got an idea to improve Pub Run?</p>
                <textarea
                  className="suggestion-textarea"
                  placeholder="Drop your suggestion here..."
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  maxLength={1200}
                  rows={7}
                />
                <button className="menu-btn" onClick={handleSuggestionSubmit}>
                  Send Suggestion
                </button>
                {suggestionStatus && <p className="suggestion-status">{suggestionStatus}</p>}
              </div>
            )}

            <div className="home-leaderboard-section">
              <Scoreboard 
                scores={topScores} 
                isAdmin={leaderboardUnlocked} 
                onUpdateScore={updateScore} 
                onDeleteScore={deleteScore} 
              />

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
                    <p className="password-error" key={passwordError + Date.now()}>
                      {passwordError}
                    </p>
                  )}
                </div>
              )}
              
              {leaderboardUnlocked && (
                <button className="settings-toggle-btn" onClick={() => setLeaderboardUnlocked(false)}>
                  🔒 Lock Settings
                </button>
              )}
            </div>

            <p className="controls-hint">
              <strong>Controls:</strong> Tap MIDDLE to step · LEFT/RIGHT to dodge
            </p>

            <div className="credits">
              <p>Creative Consultant: <strong>Mr. Walker</strong></p>
              <p>All of the hard work: <strong>Mr. Graham</strong></p>
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="screen">
          <h1 className="title" style={{backgroundImage: 'linear-gradient(135deg, #ef4444, #7f1d1d)'}}>SPLAT!</h1>
          <h2 className="subtitle">You got wiped out.</h2>
          <p style={{color: '#f8fafc', fontSize: '1.5rem', fontWeight: 'bold'}}>Steps: {score}</p>
          <Scoreboard scores={topScores} />
          <div className="gameover-buttons">
            <button className="btn" onClick={startGame}>Try Again</button>
            <button className="menu-btn" onClick={goToMainMenu}>🏠 Main Menu</button>
          </div>
        </div>
      )}

      {gameState === 'WIN' && (
        <div className="screen">
          <h1 className="title" style={{backgroundImage: 'linear-gradient(135deg, #f59e0b, #fbbf24)'}}>🏆 THE BOSS 🏆</h1>
          <h2 className="subtitle">Welcome to The Coomera Lodge!</h2>
          <p style={{fontSize: '2.5rem', fontWeight: 900, color: '#fcd34d', margin: '1rem 0'}}>Time: {finalTime.toFixed(2)}s</p>
          <p>You survived 1000 steps and are now the official Owner of the Pub.</p>
          <Scoreboard scores={topScores} />
          <div className="gameover-buttons">
            <button className="btn" onClick={startGame}>Defend Your Title</button>
            <button className="menu-btn" onClick={goToMainMenu}>🏠 Main Menu</button>
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
