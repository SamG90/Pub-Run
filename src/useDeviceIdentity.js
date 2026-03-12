import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'pubrun_device_id';
const PLAYER_NAME_KEY = 'pubrun_player_name';

function generateDeviceId() {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

export default function useDeviceIdentity() {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  });

  const [playerName, setPlayerNameState] = useState(() => {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  });

  const [isReturningPlayer, setIsReturningPlayer] = useState(() => {
    return !!localStorage.getItem(PLAYER_NAME_KEY);
  });

  const setPlayerName = (name) => {
    setPlayerNameState(name);
    if (name.trim()) {
      localStorage.setItem(PLAYER_NAME_KEY, name.trim());
      setIsReturningPlayer(true);
    }
  };

  return { deviceId, playerName, setPlayerName, isReturningPlayer };
}
