import React from 'react';
import { getTierName } from './gameRules';
import './Scoreboard.css';

const Scoreboard = ({ scores, isAdmin = false, onUpdateScore, onDeleteScore }) => {
  const [editingId, setEditingId] = React.useState(null);
  const [editValue, setEditValue] = React.useState('');

  const startEditing = (entry) => {
    setEditingId(entry._id);
    setEditValue(entry.score.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleUpdate = (id) => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val)) {
      onUpdateScore({ id, newScore: val });
      setEditingId(null);
    }
  };

  if (!scores || scores.length === 0) {
    return (
      <div className="scoreboard">
        <div className="scoreboard-title">🏆 LEADERBOARD 🏆</div>
        <div className="scoreboard-empty">No scores yet — be the first!</div>
      </div>
    );
  }

  return (
    <div className="scoreboard">
      <div className="scoreboard-title">🏆 LEADERBOARD 🏆</div>
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            {isAdmin && <th>Runs</th>}
            {isAdmin && <th>Play Time</th>}
            <th>Result</th>
            <th>Score</th>
            <th>Tier</th>
            {isAdmin && <th>Admin</th>}
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, i) => {
            const rank = i + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
            const isEditing = editingId === entry._id;
            const isHard = entry.difficulty === 'hard';

            return (
              <tr key={entry._id}>
                <td>
                  <span className={`rank-badge ${rankClass}`}>{rank}</span>
                </td>
                <td>
                  {isHard && <span className="hard-badge" title="Hard Mode">💀</span>}
                  {entry.playerName}
                </td>
                {isAdmin && <td className="admin-runs">{entry.totalRuns || 1}</td>}
                {isAdmin && <td className="admin-time">{entry.totalPlayTime ? `${Math.floor(entry.totalPlayTime / 60)}m ${Math.floor(entry.totalPlayTime % 60)}s` : '0s'}</td>}
                <td>
                  <span className={`result-badge ${entry.gameResult === 'win' ? 'result-win' : 'result-gameover'}`}>
                    {entry.gameResult === 'win' ? `🏆 ${entry.runTime?.toFixed(1) || entry.time?.toFixed(1)}s` : '💀'}
                  </span>
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      className="edit-score-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(entry._id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      autoFocus
                    />
                  ) : (
                    entry.score
                  )}
                </td>
                <td className="tier-cell">
                  {getTierName(entry.score)}
                </td>
                {isAdmin && (
                  <td className="admin-actions">
                    {isEditing ? (
                      <>
                        <button className="admin-btn confirm" onClick={() => handleUpdate(entry._id)}>✅</button>
                        <button className="admin-btn cancel" onClick={cancelEditing}>❌</button>
                      </>
                    ) : (
                      <>
                        <button className="admin-btn edit" onClick={() => startEditing(entry)}>✏️</button>
                        <button className="admin-btn delete" onClick={() => {
                          if (window.confirm(`Delete ${entry.playerName}'s score?`)) {
                            onDeleteScore({ id: entry._id });
                          }
                        }}>🗑️</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Scoreboard;
