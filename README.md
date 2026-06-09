# adhd

Minimal MVP for an **ADHD Unlock Engine** with one primary screen.

## What is implemented
- Reward zones are locked by default.
- You choose one reward and complete a micro-task timer.
- Completing the micro-task unlocks exactly one reward for a configurable 15-60 minute block.
- One active unlock at a time is enforced.
- Locked-access attempts are logged as bypasses for weekly reflection.
- Brain-dump parking notes.
- "Keys earned today" visual counter.
- Buddy-share stub that shares only the daily unlock count.

## Run
```bash
cd <repository-root>
npm start
```

Then open http://localhost:3000.

## Test
```bash
cd <repository-root>
npm test
```
