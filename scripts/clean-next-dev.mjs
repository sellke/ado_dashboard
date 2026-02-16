import { execSync } from 'node:child_process';
import path from 'node:path';

const projectName = path.basename(process.cwd()).toLowerCase();
const nextServerFragment = 'next\\dist\\server\\lib\\start-server.js';

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

console.log(`clean-next-dev: killed ${killed} stale Next.js dev process(es).`);
