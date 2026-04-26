#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_OUTPUT_ROOT = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage15x-support-stack');
const DEFAULT_CONFIG_PATH = path.join(repoRoot, 'tools', 'evaluator-training', 'examples', 'stage15x-support-stack.example.json');
const DEFAULT_REPORT_DIR = path.join(repoRoot, 'tools', 'evaluator-training', 'out', '_stage167_stage15x_export_repair');
const DEFAULT_FAMILIES = Object.freeze(['stage154-main-recenter', 'stage151-split-late3']);
const FALLBACK_INPUTS = Object.freeze([
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage29_move_ordering_smoke_input_mixed.jsonl'),
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'sample-smoke.jsonl'),
  path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage35_mpc_synthetic_18_21.jsonl'),
]);

function printUsage() {
  console.log(`Usage: node tools/evaluator-training/repair-stage15x-factorized-exports.mjs [options]\n\nOptions:\n  --family <key>         Family key to repair (repeatable). Defaults to stage154-main-recenter + stage151-split-late3.\n  --input <path>         Dummy input passed to bundle export phase. If omitted, an existing local JSONL is auto-selected.\n  --config <path>        Bundle config path. Defaults to tools/evaluator-training/examples/stage15x-support-stack.example.json\n  --output-root <path>   Bundle output root. Defaults to tools/evaluator-training/out/stage15x-support-stack\n  --report-dir <path>    Where to write the repair report. Defaults to tools/evaluator-training/out/_stage167_stage15x_export_repair\n  --resume               Forward --resume to the bundle.\n  --continue-on-error    Continue repairing remaining families after a failure.\n  --plan-only            Print what would run without changing files.\n  --help                 Show this help.\n`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }
    const key = token.slice(2);
    if (['resume', 'continue-on-error', 'plan-only', 'help'].includes(key)) {
      result[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value == null || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    if (key === 'family') {
      result.family = Array.isArray(result.family) ? result.family : [];
      result.family.push(value);
    } else if (key === 'input') {
      result.input = Array.isArray(result.input) ? result.input : [];
      result.input.push(value);
    } else {
      result[key] = value;
    }
    index += 1;
  }
  return result;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

function portable(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join('/');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function fileSizeSummary(bytes) {
  const kib = bytes / 1024;
  const mib = kib / 1024;
  return {
    bytes,
    kib: Number(kib.toFixed(2)),
    mib: Number(mib.toFixed(3)),
  };
}

async function fileSizeIfExists(targetPath) {
  if (!await pathExists(targetPath)) {
    return null;
  }
  const stat = await fs.stat(targetPath);
  return fileSizeSummary(stat.size);
}

async function selectDefaultInput(explicitInputs) {
  for (const entry of explicitInputs ?? []) {
    const resolved = path.resolve(entry);
    if (await pathExists(resolved)) {
      return resolved;
    }
  }
  for (const fallback of FALLBACK_INPUTS) {
    if (await pathExists(fallback)) {
      return fallback;
    }
  }
  throw new Error('No usable --input was provided and no fallback JSONL input could be found.');
}

async function loadBundleManifest(familyRoot) {
  const manifestPath = path.join(familyRoot, 'bundle-manifest.json');
  if (!await pathExists(manifestPath)) {
    return null;
  }
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

async function detectPrerequisites(familyRoot) {
  const sharedDir = path.join(familyRoot, 'shared');
  const moveOrderingDir = path.join(familyRoot, 'move-ordering');
  const mpcDir = path.join(familyRoot, 'mpc');
  const result = {
    familyRoot: portable(familyRoot),
    hasSharedProfiles: await pathExists(path.join(sharedDir, 'source-evaluation-profile.json'))
      && await pathExists(path.join(sharedDir, 'source-tuple-profile.json')),
    moveOrderingVariants: [],
    runtimeMpcVariants: [],
    orderingPatternVariants: [],
  };
  if (await pathExists(moveOrderingDir)) {
    const entries = await fs.readdir(moveOrderingDir);
    result.moveOrderingVariants = entries.filter((entry) => entry.endsWith('.json')).sort();
  }
  if (await pathExists(mpcDir)) {
    const entries = await fs.readdir(mpcDir);
    result.runtimeMpcVariants = entries.filter((entry) => entry.startsWith('runtime.') && entry.endsWith('.json')).sort();
  }
  const orderingPatternDir = path.join(familyRoot, 'ordering-pattern-bank');
  if (await pathExists(orderingPatternDir)) {
    const entries = await fs.readdir(orderingPatternDir);
    result.orderingPatternVariants = entries.filter((entry) => entry.endsWith('.json')).sort();
  }
  result.readyForExport = result.hasSharedProfiles && result.moveOrderingVariants.length > 0 && result.runtimeMpcVariants.length > 0;
  return result;
}

async function listExportedModules(familyRoot) {
  const exportDir = path.join(familyRoot, 'exported');
  if (!await pathExists(exportDir)) {
    return [];
  }
  const entries = (await fs.readdir(exportDir)).filter((entry) => entry.endsWith('.generated.js')).sort();
  const summaries = [];
  for (const entry of entries) {
    const absolutePath = path.join(exportDir, entry);
    const size = await fileSizeIfExists(absolutePath);
    summaries.push({
      file: entry,
      path: portable(absolutePath),
      size,
      likelyFactorizedPayload: Boolean(size && size.bytes >= 1_000_000),
    });
  }
  return summaries;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Stage15x factorized export repair report');
  lines.push('');
  lines.push(`- generatedAt: \`${report.generatedAt}\``);
  lines.push(`- inputUsed: \`${report.inputUsed}\``);
  lines.push(`- outputRoot: \`${report.outputRoot}\``);
  lines.push('');
  lines.push('| family | status | shared | move-ordering variants | runtime MPC variants | exported modules | note |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const entry of report.families) {
    lines.push(`| ${entry.familyKey} | ${entry.status} | ${entry.prerequisites?.hasSharedProfiles ? 'yes' : 'no'} | ${entry.prerequisites?.moveOrderingVariants?.length ?? 0} | ${entry.prerequisites?.runtimeMpcVariants?.length ?? 0} | ${entry.exportedModules?.length ?? 0} | ${entry.note ?? ''} |`);
  }
  lines.push('');
  for (const entry of report.families) {
    lines.push(`## ${entry.familyKey}`);
    lines.push(`- status: **${entry.status}**`);
    if (entry.note) {
      lines.push(`- note: ${entry.note}`);
    }
    if (entry.command) {
      lines.push(`- command: \`${entry.command}\``);
    }
    if (Array.isArray(entry.exportedModules) && entry.exportedModules.length > 0) {
      lines.push('- exported modules:');
      for (const moduleEntry of entry.exportedModules) {
        lines.push(`  - \`${moduleEntry.file}\`: ${moduleEntry.size?.mib ?? 'n/a'} MiB${moduleEntry.likelyFactorizedPayload ? ' (factorized payload likely present)' : ''}`);
      }
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const familyKeys = unique(Array.isArray(args.family) ? args.family : DEFAULT_FAMILIES);
  const inputUsed = await selectDefaultInput(Array.isArray(args.input) ? args.input : []);
  const configPath = args.config ? path.resolve(args.config) : DEFAULT_CONFIG_PATH;
  const outputRoot = args['output-root'] ? path.resolve(args['output-root']) : DEFAULT_OUTPUT_ROOT;
  const reportDir = args['report-dir'] ? path.resolve(args['report-dir']) : DEFAULT_REPORT_DIR;

  await ensureDir(reportDir);

  const report = {
    generatedAt: new Date().toISOString(),
    inputUsed: portable(inputUsed),
    configPath: portable(configPath),
    outputRoot: portable(outputRoot),
    families: [],
  };

  const bundleScript = path.join(repoRoot, 'tools', 'evaluator-training', 'run-stage15x-support-stack-bundle.mjs');
  let hadFailure = false;

  for (const familyKey of familyKeys) {
    const familyRoot = path.join(outputRoot, familyKey);
    const manifest = await loadBundleManifest(familyRoot);
    const prerequisites = await detectPrerequisites(familyRoot);
    const entry = {
      familyKey,
      manifestSource: manifest?.sourceModule ?? null,
      prerequisites,
      status: 'pending',
      note: null,
      command: null,
      exportedModules: [],
    };

    if (!await pathExists(familyRoot)) {
      entry.status = 'skipped';
      entry.note = 'family output directory is missing';
      report.families.push(entry);
      continue;
    }

    if (!prerequisites.readyForExport) {
      entry.status = 'skipped';
      entry.note = 'shared profiles or runtime MPC variants are incomplete; finish bundle training before export repair';
      entry.exportedModules = await listExportedModules(familyRoot);
      report.families.push(entry);
      continue;
    }

    const argv = [
      bundleScript,
      '--input', inputUsed,
      '--config', configPath,
      '--output-root', outputRoot,
      '--family', familyKey,
      '--phase', 'export',
    ];
    if (args.resume) {
      argv.push('--resume');
    }
    if (args['continue-on-error']) {
      argv.push('--continue-on-error');
    }
    if (args['plan-only']) {
      argv.push('--plan-only');
    }
    entry.command = `node ${argv.map((token, index) => {
      if (index === 0) {
        return portable(token);
      }
      if (token.startsWith(repoRoot)) {
        return portable(token);
      }
      return token.includes(' ') ? JSON.stringify(token) : token;
    }).join(' ')}`;

    const result = spawnSync(process.execPath, argv, {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });

    const logBase = path.join(reportDir, `${familyKey}`);
    await fs.writeFile(`${logBase}.stdout.log`, result.stdout ?? '', 'utf8');
    await fs.writeFile(`${logBase}.stderr.log`, result.stderr ?? '', 'utf8');

    if (result.status !== 0) {
      entry.status = 'failed';
      entry.note = `bundle export exited with code ${result.status}`;
      hadFailure = true;
      entry.exportedModules = await listExportedModules(familyRoot);
      report.families.push(entry);
      if (!args['continue-on-error']) {
        break;
      }
      continue;
    }

    entry.status = args['plan-only'] ? 'planned' : 'repaired';
    entry.exportedModules = await listExportedModules(familyRoot);
    if (entry.exportedModules.length === 0) {
      entry.note = 'bundle export succeeded but no exported modules were found';
    } else {
      const allLarge = entry.exportedModules.every((moduleEntry) => moduleEntry.likelyFactorizedPayload);
      entry.note = allLarge
        ? 'all exported modules look large enough to contain factorized payloads'
        : 'some exported modules are unexpectedly small; inspect logs before benchmarking';
    }
    report.families.push(entry);
  }

  const reportJsonPath = path.join(reportDir, 'repair-report.json');
  const reportMdPath = path.join(reportDir, 'repair-report.md');
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(reportMdPath, renderMarkdown(report), 'utf8');

  console.log(`Wrote ${portable(reportJsonPath)}`);
  console.log(`Wrote ${portable(reportMdPath)}`);
  for (const entry of report.families) {
    console.log(`${entry.familyKey}: ${entry.status}${entry.note ? ` — ${entry.note}` : ''}`);
  }

  if (hadFailure) {
    process.exitCode = 1;
  }
}

await main();
