// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conjugateGradientF } from './conjgrad.js';

/** Native harness matrix: A[i][j] = -1/((i-j)^2+1), diagonal = row sum + 0.7 (row 0). */
function harnessMatrix(): Float32Array[] {
  const n = 5;
  const rows: Float32Array[] = [];
  for (let i = 0; i < n; i++) {
    const row = new Float32Array(n);
    let d = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      row[j] = -1 / Math.fround((i - j) * (i - j) + 1);
      d = Math.fround(d - row[j]!);
    }
    row[i] = Math.fround(d + (i === 0 ? Math.fround(0.7) : 0));
    rows.push(row);
  }
  return rows;
}

/** The harness's random SPD problem (LCG seed, full-mantissa float entries). */
function randomProblem(n: number, seed: number): { rows: Float32Array[]; b: Float64Array } {
  let sd = seed;
  const rf = (): number => {
    sd = (Math.imul(sd, 1103515245) + 12345) >>> 0;
    return ((sd >>> 16) & 0x7fff) / 32768 - 0.5;
  };
  const b = Float64Array.from({ length: n }, () => { const a = rf() * 4; return a / (1.1 + rf()); });
  const rows = Array.from({ length: n }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      const a = rf() * 0.5;
      rows[i]![j] = a / (1.1 + rf());
      rows[j]![i] = rows[i]![j]!;
    }
  }
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let j = 0; j < n; j++) if (j !== i) d = Math.fround(d + Math.abs(rows[i]![j]!));
    rows[i]![i] = Math.fround(Math.fround(d + 0.25) + Math.fround(rf() * 0.1));
  }
  return { rows, b };
}

/** Native results on the harness random problem: [n, seed, x for (no ortho, ortho1, ortho1 + 2 iterations)]. */
const RANDOM_CASES: [number, number, number[][]][] = [
  [12, 2, [
    [-0.7432602612034347, -0.45212978208337257, 0.385312584316098, 0.6775161160565308, -0.349464054990012, 0.16202249165932756, -0.09988836503282851, -1.1370375023319588, -0.2116766364311244, -1.9628350227386697, -1.9097842687416247, -0.09562864681510909],
    [-0.4515879203926014, -0.19743327141971992, 1.1255944267706883, 1.0587918917571928, 0.08661450567915821, 0.7347217317675317, 0.2521663820378353, -0.5495957103155855, 0.1892521263787682, -1.2553105625856489, -1.4629599294745448, 0.26608542177823896],
    [-0.49839733831587285, -0.14750113135468162, 1.0760184603701104, 1.0651671878377422, -0.009614207286059884, 0.6915669368839872, 0.272024060724943, -0.3810404160735741, 0.31137950741942455, -1.3301256523192708, -1.4248563889266506, 0.3169781437745952],
  ]],
  [21, 3, [
    [0.003177256961284869, -0.16709401616209568, 0.032644150669409705, -0.4958540342229144, 0.21197115014262602, 0.024898414030248776, -0.15829566220242566, 0.24657302089104857, -0.11062205449977464, -0.3822232935193854, -0.21307007924809931, -0.13002875876207057, -0.8873252316617924, 0.26937377130288614, -0.2963128198114747, 0.6525888180749637, 0.10352301798918147, 0.27139971724510914, -0.4999114391235113, -0.5233536577767668, 0.22571504315634955],
    [0.07203004153978974, -0.1121938184841829, 0.13634251990203786, -0.4003939751522028, 0.3029451298462747, 0.09549588237850913, -0.07754321738291987, 0.36855497692913036, -0.0213308267953003, -0.2650861517954388, -0.07016061979374379, -0.021060801473841463, -0.7951593694218506, 0.3026648395878718, -0.2286698401470865, 0.7641990633425891, 0.242688131229534, 0.37090605275162186, -0.39786557776272724, -0.4011149951629261, 0.3572553953730395],
    [-0.01403580377043584, -0.11806504969890474, 0.184843300729167, -0.43731102619266093, 0.36894003694661975, 0.0944171843272458, -0.11370828170009664, 0.4157225423889295, -0.01875929191999684, -0.20364177661170366, -0.07035988255398867, -0.0875018534767545, -0.7553520034640387, 0.3117224243885546, -0.25464817174345844, 0.8675719422097836, 0.22870467174172976, 0.4247147743823013, -0.31033592123591397, -0.40029882421285334, 0.3921368359528465],
  ]],
];

const B = Float64Array.of(1.5, -0.25, 3, 0.125, -4.375);
const ramp = (): Float64Array => Float64Array.from({ length: 5 }, (_, i) => 0.1 * i);

afterEach(() => vi.restoreAllMocks());

describe('conjugateGradientF per-site contraction', () => {
  it.each(RANDOM_CASES)('matches the native solve on a random problem (n=%i, seed=%i)', (n, seed, expected) => {
    const { rows, b } = randomProblem(n, seed);
    const modes: [boolean, number, number][] = [[false, 1e-9, n], [true, 1e-9, n], [true, 1e-3, 2]];
    modes.forEach(([ortho, tol, iters], m) => {
      const x = Float64Array.from({ length: n }, (_, i) => (m === 0 ? 0 : 0.1 * i));
      expect(conjugateGradientF(rows, x, Float64Array.from(b), n, { tol, maxIterations: iters, ortho1: ortho })).toBe(0);
      expect(Array.from(x)).toEqual(expected[m]);
    });
  });
});

describe('conjugateGradientF', () => {
  it('matches the native solve from x = 0 without orthogonalization', () => {
    const x = new Float64Array(5);
    expect(conjugateGradientF(harnessMatrix(), x, B, 5, { tol: 1e-9, maxIterations: 5, ortho1: false })).toBe(0);
    expect(Array.from(x)).toEqual([
      1.5324136265482124e-9, -1.377864114292514, -0.4475245564086802,
      -3.026800434634706, -7.121010631360138,
    ]);
  });

  it('matches the native solve with ortho1 (x and b centred)', () => {
    const x = ramp();
    expect(conjugateGradientF(harnessMatrix(), x, B, 5, { tol: 1e-9, maxIterations: 5, ortho1: true })).toBe(0);
    expect(Array.from(x)).toEqual([
      1.5324141400263613e-9, -1.3778641142925132, -0.44752455640867916,
      -3.026800434634705, -7.121010631360137,
    ]);
  });

  it('stops at max_iterations (last iteration skips the residual update)', () => {
    const x = ramp();
    expect(conjugateGradientF(harnessMatrix(), x, B, 5, { tol: 1e-3, maxIterations: 2, ortho1: true })).toBe(0);
    expect(Array.from(x)).toEqual([
      1.2224921398656106, 0.9020369194695737, 2.064358906732615,
      -0.21852724128522089, -4.482010899365061,
    ]);
  });

  it('breaks out when p.Ap is zero', () => {
    const x = new Float64Array(2);
    const zero = [new Float32Array(2), new Float32Array(2)];
    expect(conjugateGradientF(zero, x, Float64Array.of(1, 2), 2, { tol: 0, maxIterations: 5, ortho1: false })).toBe(0);
    expect(Array.from(x)).toEqual([0, 0]);
  });

  it('returns 1 and reports when r.r underflows to zero', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const x = new Float64Array(1);
    const rv = conjugateGradientF([Float32Array.of(1e30)], x, Float64Array.of(1e-170), 1, { tol: 0, maxIterations: 2, ortho1: false });
    expect(rv).toBe(1);
    expect(err).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0]![0])).toContain('conjugate_gradient: unexpected length 0 vector');
  });
});
