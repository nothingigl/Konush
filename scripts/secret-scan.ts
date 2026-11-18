import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Local & CI secret scanner complementing Gitleaks.
 * Verifies that no tracked file is an env file with values or contains API keys / service_role tokens.
 */
const GLOBAL_SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: 'Google / Gemini API Key (AIza...)',
    regex: /AIza[0-9A-Za-z_-]{35}/,
  },
  {
    name: 'Supabase Secret Key (sb_secret_...)',
    regex: /sb_secret_[0-9A-Za-z_-]{16,}/,
  },
  {
    name: 'Private Key PEM Block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
];

const CODE_SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: 'Assigned GEMINI_API_KEY value',
    regex: /^\s*GEMINI_API_KEY\s*=\s*[^\s#]+/m,
  },
  {
    name: 'Assigned SUPABASE_SERVICE_ROLE_KEY value',
    regex: /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+/m,
  },
];

function getTrackedFiles(): string[] {
  try {
    const out = execSync('git ls-files', { encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main(): void {
  const files = getTrackedFiles();
  const findings: string[] = [];

  for (const relPath of files) {
    const base = path.basename(relPath);
    if (base.startsWith('.env') && base !== '.env.example') {
      findings.push(`Forbidden environment file tracked in Git: ${relPath}`);
      continue;
    }

    if (relPath.endsWith('.wav') || relPath.endsWith('.pcm') || relPath.startsWith('tmp/')) {
      findings.push(`Forbidden raw audio / temporary file tracked in Git: ${relPath}`);
      continue;
    }

    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) continue;

    // Skip binary files
    if (relPath.endsWith('.mp3') || relPath.endsWith('.png') || relPath.endsWith('.ico')) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of GLOBAL_SECRET_PATTERNS) {
      if (pattern.regex.test(content)) {
        findings.push(`${pattern.name} detected in ${relPath}`);
      }
    }

    const isDocFile = relPath.startsWith('docs/') || relPath.startsWith('reviews/');
    if (!isDocFile) {
      for (const pattern of CODE_SECRET_PATTERNS) {
        if (pattern.regex.test(content)) {
          findings.push(`${pattern.name} detected in ${relPath}`);
        }
      }
    }
  }

  if (findings.length > 0) {
    console.error(`[secrets:check] FAILED — ${findings.length} potential secret leak(s):`);
    for (const f of findings) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }

  console.log(`[secrets:check] OK — scanned ${files.length} tracked files, 0 leaks found.`);
}

main();
