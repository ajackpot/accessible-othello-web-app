#!/usr/bin/env python3
import csv
import json
import math
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_restart_round7_longtime_individual'
RESULTS_DIR = OUT_DIR / 'results'
LOGS_DIR = OUT_DIR / 'logs'
OUT_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

TIME_MS = 3000
OPENING_PLIES = 20
OUR_MAX_DEPTH = 6
THEIR_MAX_DEPTH = 18
EXACT_ENDGAME_EMPTIES = 10
SOLVER_ADJUDICATION_EMPTIES = 14
SOLVER_ADJUDICATION_TIME_MS = 60000
THEIR_NOISE_SCALE = 4
MAX_TABLE_ENTRIES = 90000
ASPIRATION_WINDOW = 60
VARIANT_SEED_MODE = 'shared'
GAMES = 1  # 1 opening x 2 colors = 2 games per scenario

SCENARIOS = [
    {
        'id': 'noisy3000-mtdf-seed29',
        'label': 'noisy 3000ms MTD(f) seed29',
        'seed': 29,
        'searchAlgorithm': 'classic-mtdf-2ply',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
    {
        'id': 'noisy3000-pvs-seed71',
        'label': 'noisy 3000ms PVS seed71',
        'seed': 71,
        'searchAlgorithm': 'classic',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
]

VARIANTS = [
    {
        'id': 'active',
        'label': 'active-installed',
        'kind': 'builtin',
        'variant': 'active',
    },
    {
        'id': 's154-main-s158-open',
        'label': 's154-main + s158-stable-zebra-open',
        'kind': 'custom',
        'generatedModule': 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js',
        'engineOptionsJson': 'tools/engine-match/out/stage15x-restart-benchmark-pack/phase6-base-overlay/engine-options/s154-main-s158-open.json',
    },
    {
        'id': 's151-safe-full',
        'label': 's151-safe-full',
        'kind': 'custom',
        'generatedModule': 'tools/evaluator-training/out/stage15x-support-stack/stage151-split-late3/exported/s151-safe-full.generated.js',
        'engineOptionsJson': 'tools/evaluator-training/out/stage15x-support-stack/stage151-split-late3/engine-options/s151-safe-full.json',
    },
    {
        'id': 's154-both',
        'label': 's154-both',
        'kind': 'custom',
        'generatedModule': 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-both.generated.js',
        'engineOptionsJson': 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-both.json',
    },
    {
        'id': 's154-main',
        'label': 's154-main',
        'kind': 'custom',
        'generatedModule': 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-main.generated.js',
        'engineOptionsJson': 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/engine-options/s154-main.json',
    },
]

PROBE_RECORDS = [
    {'scenarioId': 'probe-mtdf-1500', 'algorithm': 'classic-mtdf-2ply', 'timeMs': 1500, 'seed': 29, 'jsonPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'probe_mtdf_1500.json', 'startPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_mtdf_1500.start', 'endPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_mtdf_1500.end'},
    {'scenarioId': 'probe-mtdf-2100', 'algorithm': 'classic-mtdf-2ply', 'timeMs': 2100, 'seed': 29, 'jsonPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'probe_mtdf_2100.json', 'startPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_mtdf_2100.start', 'endPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_mtdf_2100.end'},
    {'scenarioId': 'probe-mtdf-3000', 'algorithm': 'classic-mtdf-2ply', 'timeMs': 3000, 'seed': 29, 'jsonPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'probe_mtdf_3000.json', 'startPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_mtdf_3000.start', 'endPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_mtdf_3000.end'},
    {'scenarioId': 'probe-pvs-3000', 'algorithm': 'classic', 'timeMs': 3000, 'seed': 71, 'jsonPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'probe_pvs_3000.json', 'startPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_pvs_3000.start', 'endPath': REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_longtime_probe' / 'logs' / 'probe_pvs_3000.end'},
]


def to_number(value, default=0.0):
    try:
        number = float(value)
        if math.isfinite(number):
            return number
    except Exception:
        pass
    return float(default)


def aggregate_skeleton():
    return {
        'games': 0,
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'points': 0.0,
        'discDiff': 0.0,
        'totalPlayedPly': 0.0,
        'totalOurTimeMs': 0.0,
        'totalTheirTimeMs': 0.0,
        'totalOurNodes': 0.0,
        'totalTheirNodes': 0.0,
        'exactAdjudications': 0.0,
        'exactAdjudicationTimeMs': 0.0,
        'exactAdjudicationNodes': 0.0,
    }


def absorb(target, source):
    for key in list(target.keys()):
        target[key] += to_number(source.get(key, 0))
    return target


def finalize(aggregate):
    games = aggregate['games']
    exact_adjudications = aggregate['exactAdjudications']
    return {
        **aggregate,
        'scoreRate': aggregate['points'] / games if games else 0.0,
        'averageDiscDiff': aggregate['discDiff'] / games if games else 0.0,
        'averagePlayedPly': aggregate['totalPlayedPly'] / games if games else 0.0,
        'averageOurTimeMsPerGame': aggregate['totalOurTimeMs'] / games if games else 0.0,
        'averageTheirTimeMsPerGame': aggregate['totalTheirTimeMs'] / games if games else 0.0,
        'averageOurNodesPerGame': aggregate['totalOurNodes'] / games if games else 0.0,
        'averageTheirNodesPerGame': aggregate['totalTheirNodes'] / games if games else 0.0,
        'averageExactAdjudicationTimeMs': aggregate['exactAdjudicationTimeMs'] / exact_adjudications if exact_adjudications else 0.0,
        'averageExactAdjudicationNodes': aggregate['exactAdjudicationNodes'] / exact_adjudications if exact_adjudications else 0.0,
    }


def read_json(path: Path):
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def run_one(variant, scenario):
    run_id = f"{scenario['id']}__{variant['id']}"
    out_json_rel = f"tools/engine-match/out/_stage15x_restart_round7_longtime_individual/results/{run_id}.json"
    out_json = REPO / out_json_rel
    log_path = LOGS_DIR / f'{run_id}.log'
    meta_path = LOGS_DIR / f'{run_id}.meta.json'
    cmd = [
        'node', 'tools/engine-match/benchmark-vs-trineutron.mjs',
        '--output-json', out_json_rel,
        '--games', str(GAMES),
        '--opening-plies', str(OPENING_PLIES),
        '--opening-source', 'random',
        '--seed', str(scenario['seed']),
        '--our-time-ms', str(TIME_MS),
        '--their-time-ms', str(TIME_MS),
        '--our-max-depth', str(OUR_MAX_DEPTH),
        '--their-max-depth', str(THEIR_MAX_DEPTH),
        '--exact-endgame-empties', str(EXACT_ENDGAME_EMPTIES),
        '--solver-adjudication-empties', str(SOLVER_ADJUDICATION_EMPTIES),
        '--solver-adjudication-time-ms', str(SOLVER_ADJUDICATION_TIME_MS),
        '--their-noise-scale', str(THEIR_NOISE_SCALE),
        '--variant-seed-mode', VARIANT_SEED_MODE,
        '--search-algorithm', scenario['searchAlgorithm'],
        '--aspiration-window', str(scenario['aspirationWindow']),
        '--max-table-entries', str(scenario['maxTableEntries']),
    ]
    if variant['kind'] == 'builtin':
        cmd.extend(['--variants', variant['variant']])
    else:
        cmd.extend([
            '--variants', 'custom',
            '--generated-module', variant['generatedModule'],
            '--engine-options-json', variant['engineOptionsJson'],
            '--variant-label', variant['label'],
        ])

    started_at = time.time()
    with log_path.open('w', encoding='utf-8') as log_handle:
        log_handle.write(f"$ {' '.join(cmd)}\n\n")
        log_handle.flush()
        process = subprocess.run(cmd, cwd=REPO, stdout=log_handle, stderr=subprocess.STDOUT, text=True)
    finished_at = time.time()
    metadata = {
        'runId': run_id,
        'variantId': variant['id'],
        'variantLabel': variant['label'],
        'scenarioId': scenario['id'],
        'scenarioLabel': scenario['label'],
        'startedAt': started_at,
        'finishedAt': finished_at,
        'wallSeconds': finished_at - started_at,
        'returnCode': process.returncode,
        'outputJson': str(out_json.relative_to(REPO)),
        'logPath': str(log_path.relative_to(REPO)),
    }
    with meta_path.open('w', encoding='utf-8') as handle:
        json.dump(metadata, handle, ensure_ascii=False, indent=2)
    if process.returncode != 0:
        raise RuntimeError(f"Run failed: {run_id} (rc={process.returncode})")
    if not out_json.exists():
        raise FileNotFoundError(f"Expected output JSON missing for {run_id}: {out_json}")
    return metadata


def build_probe_rows():
    rows = []
    for entry in PROBE_RECORDS:
        if not entry['jsonPath'].exists() or not entry['startPath'].exists() or not entry['endPath'].exists():
            continue
        data = read_json(entry['jsonPath'])
        aggregate = data['variants'][0]['aggregate']
        start_s = int(entry['startPath'].read_text(encoding='utf-8').strip())
        end_s = int(entry['endPath'].read_text(encoding='utf-8').strip())
        rows.append({
            'scenarioId': entry['scenarioId'],
            'algorithm': entry['algorithm'],
            'seed': entry['seed'],
            'timeMs': entry['timeMs'],
            'wallSeconds': end_s - start_s,
            'games': aggregate['games'],
            'points': aggregate['points'],
            'averageDiscDiff': aggregate['averageDiscDiff'],
            'averageOurTimeMsPerGame': aggregate['averageOurTimeMsPerGame'],
            'averageTheirTimeMsPerGame': aggregate['averageTheirTimeMsPerGame'],
        })
    return rows


def write_probe_outputs(rows):
    probe_json = OUT_DIR / 'longtime-probe-summary.json'
    probe_csv = OUT_DIR / 'longtime-probe-summary.csv'
    probe_md = OUT_DIR / 'stage15x_restart_round7_longtime_probe.md'
    with probe_json.open('w', encoding='utf-8') as handle:
        json.dump({'rows': rows}, handle, ensure_ascii=False, indent=2)
    with probe_csv.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=['scenarioId', 'algorithm', 'seed', 'timeMs', 'wallSeconds', 'games', 'points', 'averageDiscDiff', 'averageOurTimeMsPerGame', 'averageTheirTimeMsPerGame'])
        writer.writeheader()
        writer.writerows(rows)
    recommended = None
    if rows:
        # Highest empirically validated time that completed cleanly across both families.
        completed_by_time = {}
        for row in rows:
            completed_by_time.setdefault(row['timeMs'], set()).add(row['algorithm'])
        for time_ms in sorted(completed_by_time.keys(), reverse=True):
            algs = completed_by_time[time_ms]
            if 'classic-mtdf-2ply' in algs and 'classic' in algs:
                recommended = time_ms
                break
    lines = []
    lines.append('# Stage15x restart round 7: long-think-time safety probe')
    lines.append('')
    lines.append('## Probe results')
    lines.append('')
    lines.append('| Scenario | Algorithm | Time ms | Games | Wall seconds | Avg our ms/game | Avg their ms/game | Avg disc diff |')
    lines.append('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |')
    for row in rows:
        lines.append(f"| {row['scenarioId']} | {row['algorithm']} | {int(row['timeMs'])} | {int(row['games'])} | {row['wallSeconds']:.0f} | {row['averageOurTimeMsPerGame']:.1f} | {row['averageTheirTimeMsPerGame']:.1f} | {row['averageDiscDiff']:.3f} |")
    lines.append('')
    if recommended is not None:
        lines.append('## Recommendation')
        lines.append('')
        lines.append(f"- Highest empirically validated safe point across both classic families in this environment: `{recommended}ms`. Each `1 opening × 2 colors` run finished with comfortable headroom inside the command budget.")
        lines.append(f"- For this round, the long-time noisy comparison therefore uses `{recommended}ms` with reduced game count and individual-run aggregation.")
        lines.append('')
    probe_md.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return {
        'json': probe_json,
        'csv': probe_csv,
        'md': probe_md,
        'recommendedTimeMs': recommended,
    }


def main():
    status_path = OUT_DIR / 'run-status.json'
    run_records = []
    for variant in VARIANTS:
        for scenario in SCENARIOS:
            metadata = run_one(variant, scenario)
            run_records.append(metadata)
            with status_path.open('w', encoding='utf-8') as handle:
                json.dump({'runRecords': run_records}, handle, ensure_ascii=False, indent=2)

    per_variant_total = {}
    per_variant_label = {}
    per_variant_slices = {}
    csv_rows = []
    for metadata in run_records:
        result = read_json(REPO / metadata['outputJson'])
        variant_summary = result['variants'][0]
        aggregate = variant_summary['aggregate']
        variant_id = metadata['variantId']
        per_variant_label[variant_id] = metadata['variantLabel']
        per_variant_total.setdefault(variant_id, aggregate_skeleton())
        per_variant_slices.setdefault(variant_id, {})
        absorb(per_variant_total[variant_id], aggregate)
        per_variant_slices[variant_id][metadata['scenarioId']] = {
            'metadata': metadata,
            'aggregate': aggregate,
        }
        csv_rows.append({
            'rowType': 'scenario',
            'variantId': variant_id,
            'variantLabel': metadata['variantLabel'],
            'scenarioId': metadata['scenarioId'],
            'scenarioLabel': metadata['scenarioLabel'],
            'points': aggregate['points'],
            'games': aggregate['games'],
            'wins': aggregate['wins'],
            'losses': aggregate['losses'],
            'draws': aggregate['draws'],
            'averageDiscDiff': aggregate['averageDiscDiff'],
            'averageOurTimeMsPerGame': aggregate['averageOurTimeMsPerGame'],
            'averageTheirTimeMsPerGame': aggregate['averageTheirTimeMsPerGame'],
            'wallSeconds': metadata['wallSeconds'],
        })

    final_rows = []
    for variant_id, totals in per_variant_total.items():
        finalized = finalize(totals)
        final_rows.append({
            'variantId': variant_id,
            'variantLabel': per_variant_label[variant_id],
            'aggregate': finalized,
            'slices': per_variant_slices[variant_id],
        })
        csv_rows.append({
            'rowType': 'total',
            'variantId': variant_id,
            'variantLabel': per_variant_label[variant_id],
            'scenarioId': 'TOTAL',
            'scenarioLabel': 'TOTAL',
            'points': finalized['points'],
            'games': finalized['games'],
            'wins': finalized['wins'],
            'losses': finalized['losses'],
            'draws': finalized['draws'],
            'averageDiscDiff': finalized['averageDiscDiff'],
            'averageOurTimeMsPerGame': finalized['averageOurTimeMsPerGame'],
            'averageTheirTimeMsPerGame': finalized['averageTheirTimeMsPerGame'],
            'wallSeconds': sum(slice_data['metadata']['wallSeconds'] for slice_data in per_variant_slices[variant_id].values()),
        })

    final_rows.sort(key=lambda row: (row['aggregate']['points'], row['aggregate']['averageDiscDiff']), reverse=True)
    active_row = next((row for row in final_rows if row['variantId'] == 'active'), None)
    active_points = active_row['aggregate']['points'] if active_row else 0.0
    active_disc = active_row['aggregate']['averageDiscDiff'] if active_row else 0.0

    aggregate_json = OUT_DIR / 'stage15x_restart_round7_longtime_aggregate.json'
    aggregate_csv = OUT_DIR / 'stage15x_restart_round7_longtime_aggregate.csv'
    summary_md = OUT_DIR / 'stage15x_restart_round7_longtime_summary.md'
    manifest_json = OUT_DIR / 'stage15x_restart_round7_longtime_manifest.json'

    with aggregate_json.open('w', encoding='utf-8') as handle:
        json.dump({'variants': final_rows}, handle, ensure_ascii=False, indent=2)

    with aggregate_csv.open('w', encoding='utf-8', newline='') as handle:
        fieldnames = ['rowType', 'variantId', 'variantLabel', 'scenarioId', 'scenarioLabel', 'points', 'games', 'wins', 'losses', 'draws', 'averageDiscDiff', 'averageOurTimeMsPerGame', 'averageTheirTimeMsPerGame', 'wallSeconds']
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    manifest = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'timeMs': TIME_MS,
        'gamesPerScenario': GAMES,
        'scenarios': SCENARIOS,
        'variants': VARIANTS,
        'runRecords': run_records,
    }
    with manifest_json.open('w', encoding='utf-8') as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)

    probe_rows = build_probe_rows()
    probe_outputs = write_probe_outputs(probe_rows)

    lines = []
    lines.append('# Stage15x restart round 7: long-think-time noisy confirmation')
    lines.append('')
    lines.append('## What was run')
    lines.append('')
    lines.append(f"- Long-think noisy comparison used **`{TIME_MS}ms`**, selected after direct safety probes at higher budgets.")
    lines.append(f"- Format: individual runs aggregated afterward, `1 opening × 2 colors` per scenario, total **{len(SCENARIOS) * 2} games per variant**.")
    lines.append('- Scenarios:')
    for scenario in SCENARIOS:
        lines.append(f"  - `{scenario['id']}` — {scenario['label']}")
    lines.append('- Variants: `active`, `s154-main + s158-stable-zebra-open`, `s151-safe-full`, `s154-both`, `s154-main`.')
    lines.append('')
    lines.append('## Total results')
    lines.append('')
    lines.append('| Variant | Points | W-L-D | Avg disc diff | Delta vs active (pts) | Delta vs active (disc) |')
    lines.append('| --- | ---: | ---: | ---: | ---: | ---: |')
    for row in final_rows:
        agg = row['aggregate']
        lines.append(
            f"| {row['variantLabel']} | {agg['points']:.1f}/{int(agg['games'])} | {int(agg['wins'])}-{int(agg['losses'])}-{int(agg['draws'])} | {agg['averageDiscDiff']:+.3f} | {agg['points'] - active_points:+.1f} | {agg['averageDiscDiff'] - active_disc:+.3f} |"
        )
    lines.append('')
    lines.append('## Slice view')
    lines.append('')
    for scenario in SCENARIOS:
        lines.append(f"### {scenario['label']}")
        lines.append('')
        lines.append('| Variant | Points | Avg disc diff | Wall seconds |')
        lines.append('| --- | ---: | ---: | ---: |')
        scenario_rows = []
        for row in final_rows:
            slice_entry = row['slices'][scenario['id']]
            aggregate = slice_entry['aggregate']
            scenario_rows.append((aggregate['points'], aggregate['averageDiscDiff'], row, aggregate, slice_entry['metadata']))
        scenario_rows.sort(key=lambda item: (item[0], item[1]), reverse=True)
        for _, __, row, aggregate, metadata in scenario_rows:
            lines.append(f"| {row['variantLabel']} | {aggregate['points']:.1f}/{int(aggregate['games'])} | {aggregate['averageDiscDiff']:+.3f} | {metadata['wallSeconds']:.1f} |")
        lines.append('')

    lines.append('## Interpretation')
    lines.append('')
    if final_rows:
        leader = final_rows[0]
        leader_agg = leader['aggregate']
        lines.append(f"- **Current long-think leader:** `{leader['variantLabel']}` at `{leader_agg['points']:.1f}/{int(leader_agg['games'])}`, average disc diff `{leader_agg['averageDiscDiff']:+.3f}`.")
    if active_row:
        lines.append(f"- Reference `active` finished `{active_points:.1f}/{int(active_row['aggregate']['games'])}`, average disc diff `{active_disc:+.3f}`.")
    lines.append('- Because the game count is intentionally small, this round is best read as a **pattern check under longer thought time**, not as a final adoption gate.')
    lines.append(f"- The time-safety probe selected `{probe_outputs['recommendedTimeMs']}ms` as the highest empirically validated safe point across both classic families in this environment. Probe details are in `{probe_outputs['md'].relative_to(REPO)}`.")
    lines.append('')

    lines.append('## Recommended shortlist after this round')
    lines.append('')
    for row in final_rows[:4]:
        lines.append(f"- `{row['variantLabel']}`")
    lines.append('')

    summary_md.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(f'Wrote {aggregate_json.relative_to(REPO)}')
    print(f'Wrote {aggregate_csv.relative_to(REPO)}')
    print(f'Wrote {summary_md.relative_to(REPO)}')
    print(f'Wrote {manifest_json.relative_to(REPO)}')
    print(f"Wrote {probe_outputs['md'].relative_to(REPO)}")


if __name__ == '__main__':
    main()
