import fs from 'node:fs';
import path from 'node:path';

/**
 * Installs a lightweight Git pre-commit hook that runs secret scanning
 * before allowing a commit. Uses local node_modules/.bin/tsx directly
 * so it works in Git Bash on Windows even when pnpm is managed via Corepack.
 */
function main(): void {
  const gitHooksDir = path.join(process.cwd(), '.git', 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    return;
  }

  const preCommitPath = path.join(gitHooksDir, 'pre-commit');
  const hookScript = `#!/bin/sh
set -e

if [ -x "./node_modules/.bin/tsx" ]; then
  echo "[pre-commit] Scanning tracked files for secrets..."
  ./node_modules/.bin/tsx scripts/secret-scan.ts
fi
`;

  fs.writeFileSync(preCommitPath, hookScript, { encoding: 'utf8', mode: 0o755 });
}

main();
