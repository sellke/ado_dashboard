import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const projectName = path.basename(projectRoot).toLowerCase();
const nextServerFragment = 'next\\dist\\server\\lib\\start-server.js';
const nextCacheDir = path.join(projectRoot, '.next');

/** OneDrive-synced repos often corrupt .next symlinks (EINVAL on readlink). */
function shouldPurgeNextCache() {
  return process.platform === 'win32' && projectRoot.includes('OneDrive');
}

function purgeNextCache() {
  if (!fs.existsSync(nextCacheDir)) {
    return false;
  }
  fs.rmSync(nextCacheDir, { recursive: true, force: true });
  console.log('clean-next-dev: removed .next cache (OneDrive-safe dev startup).');
  return true;
}

function safeExec(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return '';
  }
}

function killWindowsNextDevProcesses() {
  const command = [
    'powershell -NoProfile -ExecutionPolicy Bypass -Command',
    '"Get-CimInstance Win32_Process |',
    `Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*${nextServerFragment}*' -and $_.CommandLine -like '*${projectName}*' } |`,
    "Select-Object -ExpandProperty ProcessId\"",
  ].join(' ');

  const output = safeExec(command);
  const pids = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number.parseInt(line, 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);

  for (const pid of pids) {
    safeExec(`taskkill /PID ${pid} /F`);
  }

  return pids.length;
}

function killUnixNextDevProcesses() {
  const output = safeExec(
    `pgrep -f "next/dist/server/lib/start-server.js.*${projectName}|${projectName}.*next/dist/server/lib/start-server.js"`
  );

  const pids = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number.parseInt(line, 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);

  for (const pid of pids) {
    safeExec(`kill -9 ${pid}`);
  }

  return pids.length;
}

const killed =
  process.platform === 'win32'
    ? killWindowsNextDevProcesses()
    : killUnixNextDevProcesses();

if (shouldPurgeNextCache()) {
  purgeNextCache();
}

console.log(`clean-next-dev: killed ${killed} stale Next.js dev process(es).`);
