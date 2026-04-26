#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { parseArgs, resolveCliPath, toPortablePath } from './lib.mjs';

function printUsage() {
  console.log(`Usage:
  node tools/evaluator-training/restore-runtime-ai-js-backup.mjs \
    --backup-dir backups/stage157_pre_structural_logic_20260416 [--dry-run]
`);
}

async function ensureParentDir(filePath) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || !args['backup-dir']) {
    printUsage();
    return;
  }

  const backupDir = resolveCliPath(args['backup-dir']);
  const manifestPath = path.join(backupDir, 'manifest.json');
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
  const projectRoot = resolveCliPath(manifest.projectRoot ?? path.resolve(backupDir, '..', '..'));
  const dryRun = args['dry-run'] === true;

  for (const entry of manifest.files ?? []) {
    const sourcePath = path.join(backupDir, entry.relativePath);
    const targetPath = path.join(projectRoot, entry.relativePath);
    if (dryRun) {
      console.log(`[dry-run] ${toPortablePath(path.relative(projectRoot, sourcePath))} -> ${toPortablePath(path.relative(projectRoot, targetPath))}`);
      continue;
    }
    await ensureParentDir(targetPath);
    await fs.promises.copyFile(sourcePath, targetPath);
    console.log(`[restore] ${toPortablePath(entry.relativePath)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
