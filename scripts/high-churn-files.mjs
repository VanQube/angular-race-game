#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const options = {
    limit: 20,
    since: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--limit') {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('--limit must be a positive integer');
      }
      options.limit = value;
      index += 1;
    } else if (arg === '--since') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--since requires a value');
      }
      options.since = value;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/high-churn-files.mjs [--limit 10] [--since "2 months ago"]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function getRepoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function getChangedFiles(repoRoot, since) {
  const args = ['log', '--name-only', '--pretty=format:', '--no-renames'];

  if (since) {
    args.push(`--since=${since}`);
  }

  const output = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const counts = new Map();

  for (const line of output.split(/\r?\n/)) {
    const filePath = line.trim();
    if (!filePath) {
      continue;
    }

    counts.set(filePath, (counts.get(filePath) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  });
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const repoRoot = getRepoRoot();
    const rankedFiles = getChangedFiles(repoRoot, options.since);

    if (rankedFiles.length === 0) {
      console.log('No changed files found in git history.');
      return;
    }

    const limit = Math.min(options.limit, rankedFiles.length);

    console.log(`Top ${limit} high-churn files:`);
    for (let index = 0; index < limit; index += 1) {
      const [filePath, count] = rankedFiles[index];
      console.log(`${index + 1}. ${filePath} (${count} changes)`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
