const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createServer } = require('../server.js');

function startServer(t) {
  const server = createServer({ rootDir: path.resolve(__dirname, '..') });
  server.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test('server serves the UI entrypoint', async (t) => {
  const baseUrl = startServer(t);
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /ADHD Unlock Engine/);
});

test('server exposes unlock state and task APIs', async (t) => {
  const baseUrl = startServer(t);
  const stateRes = await fetch(`${baseUrl}/api/state`);
  const initial = await stateRes.json();
  assert.equal(stateRes.status, 200);
  assert.equal(initial.state.keysEarnedToday, 0);

  const startRes = await fetch(`${baseUrl}/api/start-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rewardId: 'youtube',
      taskText: 'One admin task',
      timerSeconds: 5
    })
  });
  const startPayload = await startRes.json();
  assert.equal(startRes.status, 200);
  assert.equal(startPayload.task.rewardId, 'youtube');

  const completeRes = await fetch(`${baseUrl}/api/complete-task`, { method: 'POST' });
  const completePayload = await completeRes.json();
  assert.equal(completeRes.status, 200);
  assert.equal(completePayload.state.keysEarnedToday, 1);
});
