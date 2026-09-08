import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['test']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'visual:smoke']],
  ['git', ['diff', '--check']],
];

for (const [command, args] of commands) {
  console.log(`[validate] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`[validate] failed to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[validate] command failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log('[validate] all checks passed');
