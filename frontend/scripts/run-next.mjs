import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

dotenv.config({ path: path.join(rootDir, '.env.local') });

const mode = process.argv[2] ?? 'dev';
const allowedModes = new Set(['dev', 'start']);

if (!allowedModes.has(mode)) {
  console.error(`Unsupported mode: ${mode}`);
  process.exit(1);
}

const port = process.env.FRONTEND_PORT ?? '3998';
const nextBinPath = require.resolve('next/dist/bin/next');
const nextCmd = process.execPath;
const args = [nextBinPath, mode, '-p', port];

const child = spawn(nextCmd, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
