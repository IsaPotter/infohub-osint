const { spawn } = require('child_process');

function start(name, cmd, args, opts = {}) {
  const p = spawn(cmd, args, Object.assign({ stdio: ['ignore', 'inherit', 'inherit'], env: process.env }, opts));
  p.on('exit', (code, signal) => {
    console.error(`${name} exited with code=${code} signal=${signal}`);
  });
  return p;
}

console.log('Starting InfoHub single-container processes...');

// Start API
start('api', 'node', ['packages/api/index.js']);

// Start frontend
start('frontend', 'node', ['packages/frontend/server.js']);

// Start worker
start('worker', 'node', ['packages/worker/index.js']);

// keep process alive
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());
