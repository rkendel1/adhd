(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UnlockEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  class UnlockEngine {
    constructor(options = {}) {
      this.now = options.now || (() => Date.now());
      this.state = {
        rewards: options.rewards || [
          { id: 'youtube', name: 'Unlimited YouTube / Research Mode', durationMinutes: 30 },
          { id: 'creative', name: 'Creative Drawing App Access', durationMinutes: 25 },
          { id: 'profile', name: 'Special Interest Browser Profile', durationMinutes: 45 }
        ],
        activeUnlock: null,
        pendingTask: null,
        keysEarnedToday: 0,
        bypassCountWeek: 0,
        bypassLog: [],
        unlockHistory: [],
        brainDump: []
      };
    }

    getState(nowMs = this.now()) {
      this.tick(nowMs);
      return {
        ...JSON.parse(JSON.stringify(this.state)),
        hardGateActive: this.isHardGateActive(nowMs)
      };
    }

    isRewardUnlocked(rewardId, nowMs = this.now()) {
      this.tick(nowMs);
      return !!(
        this.state.activeUnlock &&
        this.state.activeUnlock.rewardId === rewardId &&
        this.state.activeUnlock.unlockUntilMs > nowMs
      );
    }

    isHardGateActive(nowMs = this.now()) {
      this.tick(nowMs);
      return !this.state.activeUnlock;
    }

    startMicroTask({ rewardId, taskText, timerSeconds = 30 }) {
      if (!rewardId) throw new Error('Pick a reward first.');
      if (!taskText || !taskText.trim()) throw new Error('Enter a micro hard thing.');
      if (timerSeconds <= 0) throw new Error('Timer must be positive.');

      this.tick();
      if (this.state.activeUnlock) {
        throw new Error('Only one active unlock is allowed at a time.');
      }

      const reward = this.state.rewards.find((r) => r.id === rewardId);
      if (!reward) throw new Error('Reward not found.');

      this.state.pendingTask = {
        rewardId,
        taskText: taskText.trim(),
        timerSeconds,
        startedAtMs: this.now()
      };

      return this.state.pendingTask;
    }

    completeMicroTask() {
      if (!this.state.pendingTask) throw new Error('No micro-task is running.');

      const reward = this.state.rewards.find((r) => r.id === this.state.pendingTask.rewardId);
      const unlockedAtMs = this.now();
      const unlockUntilMs = unlockedAtMs + reward.durationMinutes * 60 * 1000;

      this.state.activeUnlock = {
        rewardId: reward.id,
        unlockedAtMs,
        unlockUntilMs,
        taskText: this.state.pendingTask.taskText
      };
      this.state.keysEarnedToday += 1;
      this.state.unlockHistory.push({
        rewardId: reward.id,
        unlockedAtMs,
        unlockUntilMs
      });
      this.state.pendingTask = null;

      return this.state.activeUnlock;
    }

    requestRewardAccess(rewardId) {
      if (this.isRewardUnlocked(rewardId)) {
        return { allowed: true };
      }

      this.state.bypassCountWeek += 1;
      this.state.bypassLog.push({
        rewardId,
        attemptedAtMs: this.now(),
        reason: 'Reward is locked'
      });
      return { allowed: false };
    }

    updateRewardDuration(rewardId, durationMinutes) {
      if (this.isHardGateActive()) {
        throw new Error('Hard gate is active. Complete your micro-task to unlock first.');
      }
      const reward = this.state.rewards.find((r) => r.id === rewardId);
      if (!reward) throw new Error('Reward not found.');
      if (durationMinutes < 15 || durationMinutes > 60) {
        throw new Error('Unlock duration must be between 15 and 60 minutes.');
      }
      reward.durationMinutes = durationMinutes;
      return reward;
    }

    addBrainDump(text) {
      if (this.isHardGateActive()) {
        throw new Error('Hard gate is active. Complete your micro-task to unlock first.');
      }
      if (!text || !text.trim()) throw new Error('Brain dump text cannot be empty.');
      const note = { text: text.trim(), createdAtMs: this.now() };
      this.state.brainDump.unshift(note);
      return note;
    }

    tick(nowMs = this.now()) {
      if (this.state.activeUnlock && this.state.activeUnlock.unlockUntilMs <= nowMs) {
        this.state.activeUnlock = null;
      }
    }

    shareDailyUnlockCount() {
      if (this.isHardGateActive()) {
        throw new Error('Hard gate is active. Complete your micro-task to unlock first.');
      }
      return {
        unlockCount: this.state.keysEarnedToday,
        sharedAtMs: this.now(),
        detailsShared: false
      };
    }
  }

  return UnlockEngine;
});
