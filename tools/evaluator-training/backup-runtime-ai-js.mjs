import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

const BACKUP_FILES = Object.freeze([
  'js/ai/search-engine.js',
  'js/ai/evaluator.js',
  'js/ai/evaluation-profiles.js',
  'js/ai/learned-eval-profile.generated.js',
  'js/ai/runtime-engine-variants.js',
  'js/ai/runtime-profiles/stage154-main.generated.js',
  'js/ai/runtime-profiles/stage154-both.generated.js',
  'js/ai/worker.js',
  'js/ui/engine-client.js',
  'tools/evaluator-training/train-move-ordering-profile.mjs',
  'tools/evaluator-training/calibrate-mpc-profile.mjs',
  'tools/evaluator-training/export-profile-module.mjs',
  'tools/evaluator-training/build-generated-profile-module.mjs',
  'tools/evaluator-training/install-mpc-profile.mjs',
  'tools/evaluator-training/install-pattern-bank-profile.mjs',
  'tools/evaluator-training/out/stage151/learned-eval-profile.split_late3.factorized.generated.js',
  'tools/evaluator-training/out/stage154/modules/learned-eval-profile.main_only.recenter.factorized.generated.js',
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const label = typeof args.label === 'string' && args.label.trim() !== ''
    ? args.label.trim()
    : `runtime_ai_backup_${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}`;
  const outputDir = path.resolve(PROJECT_ROOT, 'backups', label);
  await fs.promises.mkdir(outputDir, { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    outputDir,
    files: [],
  };

  for (const relativePath of BACKUP_FILES) {
    const sourcePath = path.resolve(PROJECT_ROOT, relativePath);
    let stat = null;
    try {
      stat = await fs.promises.stat(sourcePath);
    } catch {
      manifest.files.push({ relativePath, missing: true });
      continue;
    }
    if (!stat.isFile()) {
      manifest.files.push({ relativePath, missing: true, reason: 'not-a-file' });
      continue;
    }
    const targetPath = path.resolve(outputDir, relativePath);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    const buffer = await fs.promises.readFile(sourcePath);
    await fs.promises.writeFile(targetPath, buffer);
    manifest.files.push({
      relativePath,
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
    });
  }

  const manifestPath = path.resolve(outputDir, 'manifest.json');
  await fs.promises.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputDir, manifestPath, fileCount: manifest.files.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
