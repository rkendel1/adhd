const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const UnlockEngine = require('./src/engine.js');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function parseBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  return JSON.parse(body);
}

function createServer({ engine = new UnlockEngine(), rootDir = __dirname } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;

      if (req.method === 'GET' && pathname === '/api/state') {
        sendJson(res, 200, { state: engine.getState() });
        return;
      }

      if (req.method === 'POST' && pathname.startsWith('/api/')) {
        const body = await parseBody(req);

        if (pathname === '/api/start-task') {
          const task = engine.startMicroTask({
            rewardId: body.rewardId,
            taskText: body.taskText,
            timerSeconds: Number(body.timerSeconds || 30)
          });
          sendJson(res, 200, { task, state: engine.getState() });
          return;
        }

        if (pathname === '/api/complete-task') {
          const unlock = engine.completeMicroTask();
          sendJson(res, 200, { unlock, state: engine.getState() });
          return;
        }

        if (pathname === '/api/reward-access') {
          const result = engine.requestRewardAccess(body.rewardId);
          sendJson(res, 200, { result, state: engine.getState() });
          return;
        }

        if (pathname === '/api/reward-duration') {
          const reward = engine.updateRewardDuration(body.rewardId, Number(body.durationMinutes));
          sendJson(res, 200, { reward, state: engine.getState() });
          return;
        }

        if (pathname === '/api/brain-dump') {
          const note = engine.addBrainDump(body.text);
          sendJson(res, 200, { note, state: engine.getState() });
          return;
        }

        if (pathname === '/api/share') {
          const shareResult = engine.shareDailyUnlockCount();
          sendJson(res, 200, { shareResult, state: engine.getState() });
          return;
        }
      }

      if (req.method !== 'GET') {
        sendText(res, 404, 'Not Found');
        return;
      }

      const relativePath = pathname === '/' ? '/index.html' : pathname;
      const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
      const filePath = path.join(rootDir, safePath);
      if (!filePath.startsWith(rootDir)) {
        sendText(res, 404, 'Not Found');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext];
      if (!contentType) {
        sendText(res, 404, 'Not Found');
        return;
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJson(res, 400, { error: 'Invalid JSON body.' });
        return;
      }

      if (error.code === 'ENOENT') {
        sendText(res, 404, 'Not Found');
        return;
      }

      if (error && error.message) {
        sendJson(res, 400, { error: error.message });
        return;
      }

      sendJson(res, 500, { error: 'Unexpected server error.' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, () => {
    console.log(`ADHD app running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
