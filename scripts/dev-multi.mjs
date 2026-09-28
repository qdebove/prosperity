import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], { stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], { stdio: 'inherit', windowsHide: true }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) { child.on('exit', code => stop(code ?? 0)); child.on('error', () => stop(1)); }
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
