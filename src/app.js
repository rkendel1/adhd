(function () {
  const suggestions = [
    '5 min email purge',
    'Drink water + quick tidy',
    'One admin task',
    'Reply to one important message'
  ];

  const rewardList = document.getElementById('reward-list');
  const selectedRewardInput = document.getElementById('selected-reward');
  const suggestionsList = document.getElementById('suggestions');
  const taskInput = document.getElementById('task-input');
  const timerInput = document.getElementById('task-timer-seconds');
  const startTaskBtn = document.getElementById('start-task');
  const completeTaskBtn = document.getElementById('complete-task');
  const taskStatus = document.getElementById('task-status');
  const unlockStatus = document.getElementById('unlock-status');
  const keys = document.getElementById('keys-earned');
  const bypassCount = document.getElementById('bypass-count');
  const bypassLog = document.getElementById('bypass-log');
  const noteInput = document.getElementById('brain-dump-input');
  const addNoteBtn = document.getElementById('add-brain-dump');
  const notes = document.getElementById('brain-dump-list');
  const shareBtn = document.getElementById('share-unlocks');
  const shareResult = document.getElementById('share-result');

  let countdown = null;
  let stateCache = null;

  async function api(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  }

  function isRewardUnlocked(state, rewardId) {
    return !!(
      state.activeUnlock &&
      state.activeUnlock.rewardId === rewardId &&
      state.activeUnlock.unlockUntilMs > Date.now()
    );
  }

  function lockStateLabel(state, reward) {
    return isRewardUnlocked(state, reward.id) ? 'Unlocked' : 'Locked';
  }

  function renderRewards(state) {
    rewardList.innerHTML = '';
    state.rewards.forEach((reward) => {
      const isUnlocked = isRewardUnlocked(state, reward.id);
      const card = document.createElement('div');
      card.className = `reward-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <h3>${reward.name}</h3>
        <p>Status: <strong>${lockStateLabel(state, reward)}</strong></p>
        <p>Unlock Block: ${reward.durationMinutes} minutes</p>
        <label>Duration (15-60 min):
          <input type="number" min="15" max="60" value="${reward.durationMinutes}" data-reward-duration="${reward.id}">
        </label>
        <button data-reward-select="${reward.id}">${selectedRewardInput.value === reward.id ? 'Selected' : 'Select Reward'}</button>
        <button data-reward-open="${reward.id}">${isUnlocked ? 'Enter Superpower Zone' : 'Try Access (logs bypass)'}</button>
      `;
      rewardList.appendChild(card);
    });
  }

  function renderKeys(state) {
    keys.innerHTML = '';
    for (let i = 0; i < state.keysEarnedToday; i += 1) {
      const icon = document.createElement('span');
      icon.textContent = '🗝️';
      keys.appendChild(icon);
    }
    if (state.keysEarnedToday === 0) keys.textContent = 'No keys yet.';
  }

  function renderBypass(state) {
    bypassCount.textContent = String(state.bypassCountWeek);
    bypassLog.innerHTML = '';
    state.bypassLog.slice(0, 6).forEach((entry) => {
      const li = document.createElement('li');
      const reward = state.rewards.find((r) => r.id === entry.rewardId);
      li.textContent = `${new Date(entry.attemptedAtMs).toLocaleTimeString()} - ${reward ? reward.name : entry.rewardId}`;
      bypassLog.appendChild(li);
    });
  }

  function renderNotes(state) {
    notes.innerHTML = '';
    state.brainDump.slice(0, 6).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      notes.appendChild(li);
    });
  }

  function renderUnlockStatus(state) {
    if (!state.activeUnlock) {
      unlockStatus.textContent = 'All rewards are currently locked. Earn a key to unlock one.';
      return;
    }

    const reward = state.rewards.find((r) => r.id === state.activeUnlock.rewardId);
    const remainingMs = state.activeUnlock.unlockUntilMs - Date.now();
    const remainingMin = Math.max(0, Math.ceil(remainingMs / 60000));
    unlockStatus.textContent = `${reward.name} is unlocked for ~${remainingMin} more minute(s).`;
  }

  function renderState(state) {
    stateCache = state;
    renderRewards(state);
    renderKeys(state);
    renderBypass(state);
    renderNotes(state);
    renderUnlockStatus(state);
  }

  async function render() {
    const payload = await api('/api/state');
    renderState(payload.state);
  }

  function beginTaskCountdown(seconds) {
    clearInterval(countdown);
    const start = Date.now();
    taskStatus.textContent = `Micro-task started (${seconds}s). Stay with it.`;
    completeTaskBtn.disabled = true;

    countdown = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, seconds - elapsed);
      taskStatus.textContent = `Micro-task running: ${left}s remaining`;

      if (left <= 0) {
        clearInterval(countdown);
        completeTaskBtn.disabled = false;
        taskStatus.textContent = 'Timer done. Check off to unlock your superpower zone.';
      }
    }, 250);
  }

  suggestions.forEach((item) => {
    const button = document.createElement('button');
    button.textContent = item;
    button.addEventListener('click', () => {
      taskInput.value = item;
    });
    suggestionsList.appendChild(button);
  });

  rewardList.addEventListener('click', async (event) => {
    const selectId = event.target.getAttribute('data-reward-select');
    const openId = event.target.getAttribute('data-reward-open');

    if (selectId) {
      selectedRewardInput.value = selectId;
      render().catch((error) => {
        unlockStatus.textContent = error.message;
      });
      return;
    }

    if (openId) {
      try {
        const payload = await api('/api/reward-access', {
          method: 'POST',
          body: { rewardId: openId }
        });
        if (payload.result.allowed) {
          unlockStatus.textContent = 'Superpower zone open. Dive deep guilt-free.';
        } else {
          unlockStatus.textContent = 'Still locked. Bypass attempt logged for weekly reflection.';
        }
        renderState(payload.state);
      } catch (error) {
        unlockStatus.textContent = error.message;
      }
    }
  });

  rewardList.addEventListener('change', async (event) => {
    const rewardId = event.target.getAttribute('data-reward-duration');
    if (!rewardId) return;

    try {
      const value = Number(event.target.value);
      const payload = await api('/api/reward-duration', {
        method: 'POST',
        body: { rewardId, durationMinutes: value }
      });
      renderState(payload.state);
    } catch (error) {
      unlockStatus.textContent = error.message;
    }
  });

  startTaskBtn.addEventListener('click', async () => {
    try {
      const payload = await api('/api/start-task', {
        method: 'POST',
        body: {
          rewardId: selectedRewardInput.value,
          taskText: taskInput.value,
          timerSeconds: Number(timerInput.value || 30)
        }
      });
      beginTaskCountdown(payload.task.timerSeconds);
      renderState(payload.state);
    } catch (error) {
      taskStatus.textContent = error.message;
    }
  });

  completeTaskBtn.addEventListener('click', async () => {
    try {
      const payload = await api('/api/complete-task', { method: 'POST' });
      taskStatus.textContent = 'Unlocked! Reward access granted.';
      completeTaskBtn.disabled = true;
      renderState(payload.state);
    } catch (error) {
      taskStatus.textContent = error.message;
    }
  });

  addNoteBtn.addEventListener('click', async () => {
    try {
      const payload = await api('/api/brain-dump', {
        method: 'POST',
        body: { text: noteInput.value }
      });
      noteInput.value = '';
      renderState(payload.state);
    } catch (error) {
      unlockStatus.textContent = error.message;
    }
  });

  shareBtn.addEventListener('click', async () => {
    try {
      const response = await api('/api/share', { method: 'POST' });
      shareResult.textContent = `Shared ${response.shareResult.unlockCount} daily unlock(s) with buddy sync.`;
      renderState(response.state);
    } catch (error) {
      shareResult.textContent = error.message;
    }
  });

  setInterval(() => {
    render().catch((error) => {
      unlockStatus.textContent = error.message;
    });
  }, 1000);
  render().catch((error) => {
    unlockStatus.textContent = error.message;
  });
})();
