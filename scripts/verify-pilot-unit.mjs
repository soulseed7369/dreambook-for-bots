import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Compile with TypeScript directly: this does not depend on tsx's native esbuild.
const output = mkdtempSync(path.join(tmpdir(), 'dreambook-unit-'));
try {
  const compiled = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc',
    'scripts/request-body.test.ts', 'scripts/moderation.test.ts', 'scripts/traffic.test.ts', 'scripts/public-response.test.ts', '--outDir', output,
    '--module', 'commonjs', '--target', 'ES2020', '--esModuleInterop', '--skipLibCheck'], { stdio: 'inherit' });
  if (compiled.status !== 0) process.exitCode = compiled.status ?? 1;
  else {
    const tested = spawnSync(process.execPath, ['--test',
      path.join(output, 'scripts/request-body.test.js'), path.join(output, 'scripts/moderation.test.js'), path.join(output, 'scripts/traffic.test.js'), path.join(output, 'scripts/public-response.test.js')],
    { stdio: 'inherit', env: { ...process.env, NODE_PATH: path.join(process.cwd(), 'node_modules') } });
    process.exitCode = tested.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
