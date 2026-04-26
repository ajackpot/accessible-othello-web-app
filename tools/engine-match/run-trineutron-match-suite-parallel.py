#!/usr/bin/env python3
import argparse
import csv
import json
import math
import os
import pathlib
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from copy import deepcopy

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
BENCHMARK_TOOL = PROJECT_ROOT / 'tools' / 'engine-match' / 'benchmark-vs-trineutron.mjs'

AGG_KEYS = [
    'games', 'wins', 'losses', 'draws', 'points', 'discDiff', 'totalPlayedPly',
    'totalOurTimeMs', 'totalTheirTimeMs', 'totalOurNodes', 'totalTheirNodes',
    'exactAdjudications', 'exactAdjudicationTimeMs', 'exactAdjudicationNodes',
]


def is_builtin_variant(v):
    return 'variant' in v and v.get('type') != 'custom' and v.get('variant') in {'active', 'phase-only', 'legacy'}


def merge_dicts(base, override):
    out = deepcopy(base)
    out.update(override)
    return out


def finalize_aggregate(agg):
    games = agg['games']
    exact = agg['exactAdjudications']
    return {
        **agg,
        'scoreRate': agg['points'] / games if games else 0,
        'averageDiscDiff': agg['discDiff'] / games if games else 0,
        'averagePlayedPly': agg['totalPlayedPly'] / games if games else 0,
        'averageOurTimeMsPerGame': agg['totalOurTimeMs'] / games if games else 0,
        'averageTheirTimeMsPerGame': agg['totalTheirTimeMs'] / games if games else 0,
        'averageOurNodesPerGame': agg['totalOurNodes'] / games if games else 0,
        'averageTheirNodesPerGame': agg['totalTheirNodes'] / games if games else 0,
        'averageExactAdjudicationTimeMs': agg['exactAdjudicationTimeMs'] / exact if exact else 0,
        'averageExactAdjudicationNodes': agg['exactAdjudicationNodes'] / exact if exact else 0,
    }


def empty_aggregate():
    return {k: 0 for k in AGG_KEYS}


def absorb(dst, src):
    for k in AGG_KEYS:
        dst[k] += src.get(k, 0)


def build_command(variant, scenario, output_json):
    args = [
        'node', str(BENCHMARK_TOOL),
        '--variants', variant.get('variant', 'custom'),
        '--games', str(scenario['games']),
        '--opening-plies', str(scenario['openingPlies']),
        '--seed', str(scenario['seed']),
        '--our-time-ms', str(scenario['ourTimeMs']),
        '--their-time-ms', str(scenario['theirTimeMs']),
        '--our-max-depth', str(scenario['ourMaxDepth']),
        '--their-max-depth', str(scenario['theirMaxDepth']),
        '--search-algorithm', str(scenario['searchAlgorithm']),
        '--aspiration-window', str(scenario['aspirationWindow']),
        '--max-table-entries', str(scenario['maxTableEntries']),
        '--exact-endgame-empties', str(scenario['exactEndgameEmpties']),
        '--solver-adjudication-empties', str(scenario['solverAdjudicationEmpties']),
        '--solver-adjudication-time-ms', str(scenario['solverAdjudicationTimeMs']),
        '--solver-adjudication-max-depth', str(scenario['solverAdjudicationMaxDepth']),
        '--their-noise-scale', str(scenario['theirNoiseScale']),
        '--variant-seed-mode', str(scenario['variantSeedMode']),
        '--output-json', str(output_json),
    ]
    if variant.get('type') == 'custom':
        args += ['--variant-label', variant['label']]
        if variant.get('generatedModule'):
            args += ['--generated-module', variant['generatedModule']]
        if variant.get('evaluationJson'):
            args += ['--evaluation-json', variant['evaluationJson']]
        if variant.get('moveOrderingJson'):
            args += ['--move-ordering-json', variant['moveOrderingJson']]
        if variant.get('tupleJson'):
            args += ['--tuple-json', variant['tupleJson']]
        if variant.get('mpcJson'):
            args += ['--mpc-json', variant['mpcJson']]
        if variant.get('engineOptionsJson'):
            args += ['--engine-options-json', variant['engineOptionsJson']]
        if variant.get('disableMoveOrdering'):
            args += ['--disable-move-ordering']
        if variant.get('disableTuple'):
            args += ['--disable-tuple']
        if variant.get('disableMpc'):
            args += ['--disable-mpc']
    return args


def run_task(task):
    output_json = task['output_json']
    output_json.parent.mkdir(parents=True, exist_ok=True)
    task['log_path'].parent.mkdir(parents=True, exist_ok=True)
    cmd = build_command(task['variant'], task['scenario'], output_json)
    start = time.time()
    proc = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    elapsed = time.time() - start
    task['log_path'].write_text(
        f"$ {' '.join(cmd)}\n\nSTDOUT:\n{proc.stdout}\n\nSTDERR:\n{proc.stderr}\n",
        encoding='utf-8'
    )
    return {
        'run_key': task['run_key'],
        'scenario_id': task['scenario']['id'],
        'scenario_label': task['scenario']['label'],
        'variant_id': task['variant']['id'],
        'variant_label': task['variant']['label'],
        'output_json': str(output_json.relative_to(PROJECT_ROOT)).replace('\\', '/'),
        'log_path': str(task['log_path'].relative_to(PROJECT_ROOT)).replace('\\', '/'),
        'returncode': proc.returncode,
        'elapsedSec': elapsed,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    ap.add_argument('--output-dir', required=True)
    ap.add_argument('--workers', type=int, default=4)
    args = ap.parse_args()

    config_path = (PROJECT_ROOT / args.config).resolve() if not os.path.isabs(args.config) else pathlib.Path(args.config)
    output_dir = (PROJECT_ROOT / args.output_dir).resolve() if not os.path.isabs(args.output_dir) else pathlib.Path(args.output_dir)
    config = json.loads(config_path.read_text(encoding='utf-8'))
    defaults = config.get('defaults', {})
    variants = config.get('variants', [])
    scenarios = [merge_dicts(defaults, scenario) for scenario in config.get('scenarios', [])]
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'results').mkdir(parents=True, exist_ok=True)
    (output_dir / 'logs').mkdir(parents=True, exist_ok=True)

    tasks = []
    for scenario in scenarios:
        for variant in variants:
            output_json = output_dir / 'results' / scenario['id'] / f"{variant['id']}.json"
            log_path = output_dir / 'logs' / scenario['id'] / f"{variant['id']}.log"
            tasks.append({
                'run_key': f"{scenario['id']}::{variant['id']}",
                'scenario': scenario,
                'variant': variant,
                'output_json': output_json,
                'log_path': log_path,
            })

    print(f"Parallel round start: {len(tasks)} runs, workers={args.workers}")
    status_entries = []
    failures = []
    completed = 0
    start_all = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        future_map = {ex.submit(run_task, task): task for task in tasks}
        for future in as_completed(future_map):
            result = future.result()
            completed += 1
            status_entries.append(result)
            prefix = f"[{completed}/{len(tasks)}] {result['run_key']}"
            if result['returncode'] == 0:
                print(f"{prefix} ok {result['elapsedSec']:.1f}s")
            else:
                print(f"{prefix} FAIL rc={result['returncode']} {result['elapsedSec']:.1f}s")
                failures.append(result)
            status_payload = {
                'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'configPath': str(config_path.relative_to(PROJECT_ROOT)).replace('\\', '/'),
                'outputDir': str(output_dir.relative_to(PROJECT_ROOT)).replace('\\', '/'),
                'workers': args.workers,
                'completedRuns': completed,
                'totalRuns': len(tasks),
                'entries': sorted(status_entries, key=lambda x: x['run_key']),
            }
            (output_dir / 'parallel-status.json').write_text(json.dumps(status_payload, indent=2), encoding='utf-8')

    elapsed_all = time.time() - start_all
    if failures:
        print(f"Parallel round failed: {len(failures)} failures")
        sys.exit(1)

    # Aggregate
    aggregate_by_variant = {}
    results_by_scenario = {}
    comparisons = []
    reference_variant_id = config.get('referenceVariantId')
    for scenario in scenarios:
        scenario_agg = {}
        scenario_variants = []
        for variant in variants:
            result_path = output_dir / 'results' / scenario['id'] / f"{variant['id']}.json"
            run_output = json.loads(result_path.read_text(encoding='utf-8'))
            variant_summary = run_output['variants'][0]
            agg = variant_summary['aggregate']
            scenario_agg[variant['id']] = agg
            scenario_variants.append({
                'scenarioId': scenario['id'],
                'scenarioLabel': scenario['label'],
                'variantId': variant['id'],
                'variantLabel': variant['label'],
                'outputJsonPath': str(result_path.relative_to(PROJECT_ROOT)).replace('\\', '/'),
                'aggregate': agg,
            })
            aggregate_by_variant.setdefault(variant['id'], empty_aggregate())
            absorb(aggregate_by_variant[variant['id']], agg)
        results_by_scenario[scenario['id']] = {
            'id': scenario['id'],
            'label': scenario['label'],
            'searchAlgorithm': scenario['searchAlgorithm'],
            'variants': scenario_variants,
        }
        ref = scenario_agg.get(reference_variant_id)
        if ref is not None:
            for variant in variants:
                agg = scenario_agg[variant['id']]
                comparisons.append({
                    'scope': 'scenario',
                    'scenarioId': scenario['id'],
                    'variantId': variant['id'],
                    'pointsDiffVsReference': agg['points'] - ref['points'],
                    'averageDiscDiffDiffVsReference': agg['averageDiscDiff'] - ref['averageDiscDiff'],
                })

    aggregate_by_variant_final = {k: finalize_aggregate(v) for k, v in aggregate_by_variant.items()}
    ref_total = aggregate_by_variant_final.get(reference_variant_id)
    if ref_total is not None:
        for variant in variants:
            agg = aggregate_by_variant_final[variant['id']]
            comparisons.append({
                'scope': 'total',
                'scenarioId': 'ALL',
                'variantId': variant['id'],
                'pointsDiffVsReference': agg['points'] - ref_total['points'],
                'averageDiscDiffDiffVsReference': agg['averageDiscDiff'] - ref_total['averageDiscDiff'],
            })

    suite_summary = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'configPath': str(config_path.relative_to(PROJECT_ROOT)).replace('\\', '/'),
        'outputDir': str(output_dir.relative_to(PROJECT_ROOT)).replace('\\', '/'),
        'referenceVariantId': reference_variant_id,
        'runCount': len(tasks),
        'successCount': len(tasks),
        'failureCount': 0,
        'skippedCount': 0,
        'elapsedSec': elapsed_all,
        'variants': variants,
        'scenarios': scenarios,
        'resultsByScenario': results_by_scenario,
        'aggregateByVariant': aggregate_by_variant_final,
        'comparisons': comparisons,
    }
    (output_dir / 'suite-summary.json').write_text(json.dumps(suite_summary, indent=2), encoding='utf-8')
    (output_dir / 'suite-status.json').write_text(json.dumps({
        'generatedAt': suite_summary['generatedAt'],
        'runCount': len(tasks),
        'successCount': len(tasks),
        'failureCount': 0,
        'entries': sorted(status_entries, key=lambda x: x['run_key']),
    }, indent=2), encoding='utf-8')

    # CSV
    csv_rows = []
    for scenario in scenarios:
        for variant in variants:
            agg = results_by_scenario[scenario['id']]['variants'][[v['variantId'] for v in results_by_scenario[scenario['id']]['variants']].index(variant['id'])]['aggregate']
            csv_rows.append({
                'scope': 'scenario',
                'scenario': scenario['id'],
                'variant': variant['id'],
                'points': agg['points'],
                'wins': agg['wins'],
                'losses': agg['losses'],
                'draws': agg['draws'],
                'games': agg['games'],
                'avg_disc_diff': agg['averageDiscDiff'],
                'json_path': f"tools/engine-match/out/{output_dir.name}/results/{scenario['id']}/{variant['id']}.json",
            })
    for variant in variants:
        agg = aggregate_by_variant_final[variant['id']]
        csv_rows.append({
            'scope': 'total',
            'scenario': 'ALL',
            'variant': variant['id'],
            'points': agg['points'],
            'wins': agg['wins'],
            'losses': agg['losses'],
            'draws': agg['draws'],
            'games': agg['games'],
            'avg_disc_diff': agg['averageDiscDiff'],
            'json_path': '',
        })
    with (output_dir / 'aggregate.csv').open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=['scope', 'scenario', 'variant', 'points', 'wins', 'losses', 'draws', 'games', 'avg_disc_diff', 'json_path'])
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"Parallel round complete in {elapsed_all:.1f}s")


if __name__ == '__main__':
    main()
