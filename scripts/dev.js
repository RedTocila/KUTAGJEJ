#!/usr/bin/env node
/**
 * Local full-stack dev — always:
 *   http://localhost:3000  (Next)
 *   http://localhost:5001  (Express API, proxied via /api)
 *
 * Frees :3000/:5001 before start so Next never hops to 3001.
 * Restarts the API if it dies so messages/packages stop 500-ing.
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

const root = path.join(__dirname, '..');
const API_PORT = Number(process.env.API_PORT || process.env.PORT) || 5001;
const WEB_PORT = Number(process.env.WEB_PORT) || 3000;

let shuttingDown = false;
let apiChild = null;
let webChild = null;
let apiRestartTimer = null;

function log(scope, msg) {
  console.log(`[${scope}] ${msg}`);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function killPids(pids, signal = 'SIGTERM') {
  for (const pid of pids) {
    const n = Number(pid);
    if (!Number.isFinite(n) || n <= 0 || n === process.pid) continue;
    try {
      process.kill(n, signal);
    } catch {
      /* already gone */
    }
  }
}

function pidsOnPort(port) {
  try {
    return [
      ...new Set(
        execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: 'utf8' })
          .trim()
          .split(/\s+/)
          .filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}

function freePort(port) {
  const first = pidsOnPort(port);
  if (first.length) {
    log('dev', `freeing :${port} (pids ${first.join(', ')})`);
    killPids(first, 'SIGTERM');
    sleepSync(400);
  }
  const still = pidsOnPort(port);
  if (still.length) {
    killPids(still, 'SIGKILL');
    sleepSync(300);
  }
}

/** Next 16 refuses a second `next dev` via a lock file even after the port is free. */
function clearNextDevLock() {
  const lockPath = path.join(root, '.next', 'dev', 'lock');
  try {
    const fs = require('fs');
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      log('dev', 'removed stale .next/dev/lock');
    }
  } catch (err) {
    log('dev', `could not clear Next lock: ${err.message}`);
  }
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 90_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.connect({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for :${port}`));
          return;
        }
        setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

function spawnApi() {
  if (shuttingDown) return;
  log('api', `starting on :${API_PORT}…`);
  apiChild = spawn('node', ['server.js'], {
    cwd: path.join(root, 'backend'),
    stdio: 'inherit',
    env: { ...process.env, PORT: String(API_PORT) },
  });

  apiChild.on('exit', (code, signal) => {
    apiChild = null;
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    log('api', `exited (${reason}); restarting in 1s…`);
    clearTimeout(apiRestartTimer);
    apiRestartTimer = setTimeout(() => {
      freePort(API_PORT);
      spawnApi();
    }, 1000);
  });
}

function spawnWeb() {
  log('web', `starting Next on http://localhost:${WEB_PORT} …`);
  // Fixed -p only — do not pass -H localhost (can bind IPv6-only on macOS).
  webChild = spawn('npx', ['next', 'dev', '-p', String(WEB_PORT)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(WEB_PORT) },
  });

  webChild.on('exit', (code, signal) => {
    webChild = null;
    if (shuttingDown) return;
    log('web', `exited (${signal || code}); shutting down`);
    shutdown(typeof code === 'number' ? code : 1);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(apiRestartTimer);
  if (apiChild && !apiChild.killed) {
    try {
      apiChild.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  if (webChild && !webChild.killed) {
    try {
      webChild.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(exitCode), 400);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  log('dev', `always binding web → http://localhost:${WEB_PORT}`);
  freePort(WEB_PORT);
  freePort(API_PORT);
  clearNextDevLock();

  spawnApi();
  try {
    await waitForPort(API_PORT);
    log('api', `ready → http://localhost:${API_PORT}`);
  } catch (err) {
    console.error(`[api] ${err.message} (will keep retrying)`);
  }

  spawnWeb();
  try {
    await waitForPort(WEB_PORT);
    log('web', `ready → http://localhost:${WEB_PORT}`);
  } catch (err) {
    console.error(`[web] ${err.message}`);
    shutdown(1);
  }
})();
