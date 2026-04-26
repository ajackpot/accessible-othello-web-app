#!/usr/bin/env python3
import csv
import json
import math
import subprocess
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / 'tools' / 'engine-match' / 'out' / '_stage15x_restart_round9_new_variant_only'
RESULTS_DIR = OUT_DIR / 'results'
LOGS_DIR = OUT_DIR / 'logs'
OUT_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

TIME_MS = 1500
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
        'id': 'noisy1500-mtdf-seed29',
        'label': 'noisy 1500ms MTD(f) seed29',
        'seed': 29,
        'searchAlgorithm': 'classic-mtdf-2ply',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
    {
        'id': 'noisy1500-mtdf-seed53',
        'label': 'noisy 1500ms MTD(f) seed53',
        'seed': 53,
        'searchAlgorithm': 'classic-mtdf-2ply',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
    {
        'id': 'noisy1500-mtdf-seed107',
        'label': 'noisy 1500ms MTD(f) seed107',
        'seed': 107,
        'searchAlgorithm': 'classic-mtdf-2ply',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
    {
        'id': 'noisy1500-pvs-seed71',
        'label': 'noisy 1500ms PVS seed71',
        'seed': 71,
        'searchAlgorithm': 'classic',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
    {
        'id': 'noisy1500-pvs-seed89',
        'label': 'noisy 1500ms PVS seed89',
        'seed': 89,
        'searchAlgorithm': 'classic',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
    {
        'id': 'noisy1500-pvs-seed131',
        'label': 'noisy 1500ms PVS seed131',
        'seed': 131,
        'searchAlgorithm': 'classic',
        'aspirationWindow': 60,
        'maxTableEntries': 90000,
    },
]

VARIANTS = [
    {
        'id': 's154-both-s158-open',
        'label': 's154-both + s158-stable-zebra-open',
        'kind': 'custom',
        'generatedModule': 'tools/evaluator-training/out/stage15x-support-stack/stage154-main-recenter/exported/s154-both.generated.js',
        'engineOptionsJson': 'tools/engine-match/out/stage15x-restart-benchmark-pack/phase9-both-open-overlay/engine-options/s154-both-s158-open.json',
    },
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
    out_json_rel = f"tools/engine-match/out/_stage15x_restart_round9_new_variant_only/results/{run_id}.json"
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

    print(f"[run] {run_id} start", flush=True)
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
    print(f"[run] {run_id} done rc={process.returncode} wall={finished_at - started_at:.1f}s", flush=True)
    if process.returncode != 0:
        raise RuntimeError(f"Run failed: {run_id} (rc={process.returncode})")
    if not out_json.exists():
        raise FileNotFoundError(f"Expected output JSON missing for {run_id}: {out_json}")
    return metadata


def scenario_family(scenario_id: str) -> str:
    return 'mtdf' if '-mtdf-' in scenario_id else 'pvs'


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
    per_variant_family = {}
    csv_rows = []
    for metadata in run_records:
        result = read_json(REPO / metadata['outputJson'])
        variant_summary = result['variants'][0]
        aggregate = variant_summary['aggregate']
        variant_id = metadata['variantId']
        family = scenario_family(metadata['scenarioId'])
        per_variant_label[variant_id] = metadata['variantLabel']
        per_variant_total.setdefault(variant_id, aggregate_skeleton())
        per_variant_family.setdefault(variant_id, {'mtdf': aggregate_skeleton(), 'pvs': aggregate_skeleton()})
        per_variant_slices.setdefault(variant_id, {})
        absorb(per_variant_total[variant_id], aggregate)
        absorb(per_variant_family[variant_id][family], aggregate)
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
            'family': family,
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
        family_rows = {key: finalize(value) for key, value in per_variant_family[variant_id].items()}
        final_rows.append({
            'variantId': variant_id,
            'variantLabel': per_variant_label[variant_id],
            'aggregate': finalized,
            'family': family_rows,
            'slices': per_variant_slices[variant_id],
        })
        for family_name, family_agg in family_rows.items():
            csv_rows.append({
                'rowType': 'family',
                'variantId': variant_id,
                'variantLabel': per_variant_label[variant_id],
                'scenarioId': family_name.upper(),
                'scenarioLabel': family_name.upper(),
                'family': family_name,
                'points': family_agg['points'],
                'games': family_agg['games'],
                'wins': family_agg['wins'],
                'losses': family_agg['losses'],
                'draws': family_agg['draws'],
                'averageDiscDiff': family_agg['averageDiscDiff'],
                'averageOurTimeMsPerGame': family_agg['averageOurTimeMsPerGame'],
                'averageTheirTimeMsPerGame': family_agg['averageTheirTimeMsPerGame'],
                'wallSeconds': sum(slice_data['metadata']['wallSeconds'] for sid, slice_data in per_variant_slices[variant_id].items() if scenario_family(sid) == family_name),
            })
        csv_rows.append({
            'rowType': 'total',
            'variantId': variant_id,
            'variantLabel': per_variant_label[variant_id],
            'scenarioId': 'TOTAL',
            'scenarioLabel': 'TOTAL',
            'family': 'total',
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

    aggregate_json = OUT_DIR / 'stage15x_restart_round9_new_variant_only_aggregate.json'
    aggregate_csv = OUT_DIR / 'stage15x_restart_round9_new_variant_only_aggregate.csv'
    summary_md = OUT_DIR / 'stage15x_restart_round9_new_variant_only_summary.md'
    manifest_json = OUT_DIR / 'stage15x_restart_round9_new_variant_only_manifest.json'

    with aggregate_json.open('w', encoding='utf-8') as handle:
        json.dump({'variants': final_rows}, handle, ensure_ascii=False, indent=2)

    with aggregate_csv.open('w', encoding='utf-8', newline='') as handle:
        fieldnames = ['rowType', 'variantId', 'variantLabel', 'scenarioId', 'scenarioLabel', 'family', 'points', 'games', 'wins', 'losses', 'draws', 'averageDiscDiff', 'averageOurTimeMsPerGame', 'averageTheirTimeMsPerGame', 'wallSeconds']
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

    lines = []
    lines.append('# Stage15x restart round 9: new variant only')
    lines.append('')
    lines.append('## What was run')
    lines.append('')
    lines.append(f"- Focused long-think follow-up used **`{TIME_MS}ms`**, comfortably below the previously validated `3000ms` plateau.")
    lines.append(f"- Format: individual runs aggregated afterward, `1 opening × 2 colors` per scenario, total **{len(SCENARIOS) * 2} games per variant**.")
    lines.append('- Scenarios:')
    for scenario in SCENARIOS:
        lines.append(f"  - `{scenario['id']}` — {scenario['label']}")
    lines.append('- Variant: `s154-both + s158-stable-zebra-open` only.')
    lines.append('')
    lines.append('## Total results')
    lines.append('')
    lines.append('| Variant | Points | W-L-D | Avg disc diff | Delta vs active (pts) | Delta vs active (disc) | Avg wall sec/scenario |')
    lines.append('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
    for row in final_rows:
        agg = row['aggregate']
        avg_wall = sum(slice_data['metadata']['wallSeconds'] for slice_data in row['slices'].values()) / len(SCENARIOS)
        lines.append(
            f"| {row['variantLabel']} | {agg['points']:.1f}/{int(agg['games'])} | {int(agg['wins'])}-{int(agg['losses'])}-{int(agg['draws'])} | {agg['averageDiscDiff']:+.3f} | {agg['points'] - active_points:+.1f} | {agg['averageDiscDiff'] - active_disc:+.3f} | {avg_wall:.1f} |"
        )
    lines.append('')
    lines.append('## Family slices')
    lines.append('')
    for family_name, family_label in [('mtdf', 'MTD(f)'), ('pvs', 'PVS')]:
        lines.append(f"### {family_label}")
        lines.append('')
        lines.append('| Variant | Points | W-L-D | Avg disc diff |')
        lines.append('| --- | ---: | ---: | ---: |')
        family_rows_sorted = sorted(final_rows, key=lambda row: (row['family'][family_name]['points'], row['family'][family_name]['averageDiscDiff']), reverse=True)
        for row in family_rows_sorted:
            agg = row['family'][family_name]
            lines.append(f"| {row['variantLabel']} | {agg['points']:.1f}/{int(agg['games'])} | {int(agg['wins'])}-{int(agg['losses'])}-{int(agg['draws'])} | {agg['averageDiscDiff']:+.3f} |")
        lines.append('')

    lines.append('## Per-scenario view')
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
        lines.append(f"- **Current 1500ms leader:** `{leader['variantLabel']}` at `{leader_agg['points']:.1f}/{int(leader_agg['games'])}`, average disc diff `{leader_agg['averageDiscDiff']:+.3f}`.")
    if active_row:
        lines.append(f"- No builtin control was rerun in this file; compare against the stored round 8 control pack for the other four variants.")
    lines.append('- This file intentionally reruns only the newly requested overlay candidate.')
    lines.append('- The key read is whether applying the same stable-zebra-open overlay on `s154-both` improves, holds, or hurts relative to stored `s154-both` and `s154-main+s158-open`.')
    lines.append('')
    lines.append('## Candidate note after this run')
    lines.append('')
    for row in final_rows:
        lines.append(f"- `{row['variantLabel']}`")
    lines.append('')

    summary_md.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(f'Wrote {aggregate_json.relative_to(REPO)}')
    print(f'Wrote {aggregate_csv.relative_to(REPO)}')
    print(f'Wrote {summary_md.relative_to(REPO)}')
    print(f'Wrote {manifest_json.relative_to(REPO)}')


if __name__ == '__main__':
    main()
