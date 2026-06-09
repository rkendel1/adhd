const test = require('node:test');
const assert = require('node:assert/strict');
const UnlockEngine = require('../src/engine.js');

test('rewards are locked by default', () => {
  const engine = new UnlockEngine();
  const [first] = engine.getState().rewards;
  assert.equal(engine.isRewardUnlocked(first.id), false);
});

test('completing micro-task unlocks selected reward', () => {
  let nowMs = 1000;
  const engine = new UnlockEngine({ now: () => nowMs });
  engine.startMicroTask({ rewardId: 'youtube', taskText: 'One admin task', timerSeconds: 5 });
  engine.completeMicroTask();

  assert.equal(engine.isRewardUnlocked('youtube', nowMs + 1), true);
});

test('only one active unlock is allowed', () => {
  const engine = new UnlockEngine();
  engine.startMicroTask({ rewardId: 'youtube', taskText: 'Email purge', timerSeconds: 5 });
  engine.completeMicroTask();

  assert.throws(() => {
    engine.startMicroTask({ rewardId: 'creative', taskText: 'Drink water + tidy', timerSeconds: 5 });
  }, /Only one active unlock/);
});

test('locked access attempts are logged as bypasses', () => {
  const engine = new UnlockEngine();
  const result = engine.requestRewardAccess('youtube');
  const state = engine.getState();

  assert.equal(result.allowed, false);
  assert.equal(state.bypassCountWeek, 1);
  assert.equal(state.bypassLog.length, 1);
});

test('unlock expires and relocks reward', () => {
  let nowMs = 0;
  const engine = new UnlockEngine({
    now: () => nowMs,
    rewards: [{ id: 'youtube', name: 'YouTube', durationMinutes: 15 }]
  });

  engine.startMicroTask({ rewardId: 'youtube', taskText: 'Quick tidy', timerSeconds: 1 });
  engine.completeMicroTask();

  assert.equal(engine.isRewardUnlocked('youtube', nowMs + 1000), true);

  nowMs = 15 * 60 * 1000 + 1;
  assert.equal(engine.isRewardUnlocked('youtube', nowMs), false);
});

test('hard gate blocks non-task actions until unlock', () => {
  const engine = new UnlockEngine();

  assert.equal(engine.getState().hardGateActive, true);
  assert.throws(() => engine.addBrainDump('Remember this'), /Hard gate is active/);
  assert.throws(() => engine.shareDailyUnlockCount(), /Hard gate is active/);

  engine.startMicroTask({ rewardId: 'youtube', taskText: 'Do one hard thing', timerSeconds: 1 });
  engine.completeMicroTask();

  assert.equal(engine.getState().hardGateActive, false);
  assert.doesNotThrow(() => engine.addBrainDump('Now unlocked.'));
  assert.doesNotThrow(() => engine.shareDailyUnlockCount());
});
