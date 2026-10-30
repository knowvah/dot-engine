import json, subprocess, random, os
H = './harness'
F = '../wt/T7/src/layout/neato/__fixtures__/ipsep'
env = dict(os.environ)
B = os.path.expanduser('~/git/graphviz/build/lib')
env['DYLD_LIBRARY_PATH'] = ':'.join(f'{B}/{d}' for d in ['gvc','cgraph','cdt','pathplan','xdot'])
def run(args, inp=None):
    return json.loads(subprocess.run([H]+args, input=inp, capture_output=True, text=True, env=env, check=True).stdout)
models = []
for name, gv, fn, mode in [
  ('subset ipsep', f'{F}/model-subset.gv', 'subset', 'w'),
  ('subset unweighted', f'{F}/model-subset.gv', 'subset', 'n'),
  ('subset ipsep-rand-len ipsep', f'{F}/ipsep-rand-len.gv', 'subset', 'w'),
  ('subset ipsep-rand-len unweighted', f'{F}/ipsep-rand-len.gv', 'subset', 'n'),
  ('subset ipsep-rand-len with len', f'{F}/ipsep-rand-len.gv', 'subset', 'wl'),
  ('circuit ipsep', f'{F}/model-circuit.gv', 'circuit', 'w'),
  ('circuit unweighted', f'{F}/model-circuit.gv', 'circuit', 'n'),
  ('circuit ipsep-rand-len', f'{F}/ipsep-rand-len.gv', 'circuit', 'w'),
  ('circuit ipsep-rand-len unweighted', f'{F}/ipsep-rand-len.gv', 'circuit', 'n'),
  ('circuit disconnected', 'disconnected.gv', 'circuit', 'w'),
]:
    r = run([gv, fn, mode])
    r['name'] = name; r['fn'] = fn
    models.append(r)
def raw(name, fn, rows):
    inp = str(len(rows)) + '\n' + '\n'.join(' '.join([str(len(r['edges']))] + [str(e) for e in r['edges']] + ['%.17g' % w for w in r['ewgts']]) for r in rows) + '\n'
    r = run(['raw', fn], inp)
    r['rows'] = rows; r['name'] = name; r['fn'] = fn
    models.append(r)
# duplicate neighbours drive deg_i + deg_j - 2*common below 0: size_t wraps to 2^64
raw('subset size_t wrap', 'subset', [
    {'edges': [0, 1, 2], 'ewgts': [0, 1, 1]},
    {'edges': [1, 2, 2, 2, 2], 'ewgts': [0, 1, 1, 1, 1]},
    {'edges': [2], 'ewgts': [0]}])
random.seed(7)
mats = []
def m(name, a):
    n = len(a)
    inp = ' '.join('%.17g' % v for row in a for v in row)
    r = run(['matinv', str(n)], inp)
    mats.append({'name': name, 'a': a, 'rv': r['rv'], 'inv': r['inv']})
for n in (12, 20):
    m(f'random {n}x{n}', [[random.uniform(-1, 1) for _ in range(n)] for _ in range(n)])
m('1x1', [[5.0]])
m('zero row', [[1.0, 2.0, 3.0], [0.0, 0.0, 0.0], [4.0, 5.0, 7.0]])
m('zero column', [[0.0, 2.0, 3.0], [0.0, 1.0, 5.0], [0.0, 5.0, 7.0]])
m('singular last pivot', [[1.0, 2.0], [2.0, 4.0]])
m('pivoting', [[0.0, 1.0, 2.0], [3.0, 1.0, -1.0], [1.0, 4.0, 0.5]])
def js(v): return json.dumps(v, separators=(',', ':'))
out = ['// SPDX-License-Identifier: EPL-2.0',
'/**',
' * Expected results for the T7 subset/circuit distance-model tests, captured from a',
' * native clang -O3 -flto=thin -arch arm64 harness that links the oracle\'s own',
' * lib/neatogen/libneatogen.a (graphviz 16.1.0) and calls',
' * `compute_apsp_artificial_weights_packed`, `circuitModel` and `matinv`.',
' * `rows` are the `vtx_data` built as `neatoinit.c:makeGraphData` does for mode=ipsep',
' * (`ewgts` = len or 1.0; subset ignores len) or with `ewgts == NULL` (`null`);',
' * graphs are `ipsep/model-subset.gv`, `ipsep/model-circuit.gv`, `ipsep/ipsep-rand-len.gv`',
' * and `graph{a--b; b--c; d--e}`. "with len" keeps len under subset to drive fmaxf;',
' * "size_t wrap" is hand-built rows with duplicate neighbours (not makeGraphData output).',
' * Generated data: do not hand-edit.',
' */',
'',
'/** One `vtx_data` row; `ewgts: null` is C `NULL`. */',
'export interface ModelRow {',
'  readonly edges: readonly number[];',
'  readonly ewgts: readonly number[] | null;',
'}',
'',
'/** One model call and its native result. */',
'export interface ModelCase {',
'  readonly name: string;',
'  readonly fn: \'subset\' | \'circuit\';',
'  readonly rows: readonly ModelRow[];',
'  /** Native packed `Dij` (float32 values), or `null` (C `NULL`). */',
'  readonly dij: readonly number[] | null;',
'  /** `graph[0].ewgts == NULL` after the call. */',
'  readonly ewgts0Null: 0 | 1;',
'  /** Rows after the call (weighted inputs only). */',
'  readonly after?: readonly ModelRow[];',
'}',
'',
'/** One `matinv` call and its native result. */',
'export interface MatinvCase {',
'  readonly name: string;',
'  readonly a: readonly (readonly number[])[];',
'  readonly rv: 0 | 1;',
'  readonly inv: readonly (readonly number[])[];',
'}',
'',
'export const MODEL_CASES: readonly ModelCase[] = [']
for r in models:
    keys = ['name','fn','rows','dij','ewgts0Null'] + (['after'] if 'after' in r else [])
    out.append('  {' + ', '.join(f'{k}: {js(r[k])}' for k in keys) + '},')
out.append('];')
out.append('')
out.append('export const MATINV_CASES: readonly MatinvCase[] = [')
for r in mats:
    out.append('  {' + ', '.join(f'{k}: {js(r[k])}' for k in ['name','a','rv','inv']) + '},')
out.append('];')
open('../wt/T7/src/layout/neato/__fixtures__/stress-models.ts','w').write('\n'.join(out)+'\n')
for r in models: print(r['name'], 'null' if r['dij'] is None else len(r['dij']), r['ewgts0Null'])
for r in mats: print(r['name'], r['rv'])
