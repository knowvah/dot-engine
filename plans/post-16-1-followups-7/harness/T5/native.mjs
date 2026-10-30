import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const WT = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/9d351319-b84e-43c1-b16b-bf038d507e30/scratchpad/wt/T5';
const m = JSON.parse(fs.readFileSync(WT + '/test/corpus/corpus-manifest.json', 'utf8'));
const byId = new Map(m.map((x) => [x.id, x]));
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const out = {};
for (const key of fs.readFileSync('diffkeys.txt', 'utf8').trim().split('\n')) {
  const [id, eng] = key.split(' ');
  const src0 = fs.readFileSync(path.resolve(ROOT, byId.get(id).path), 'latin1');
  const i = src0.indexOf('{');
  const src = src0.slice(0, i + 1) + ' overlap=vpsc; ' + src0.slice(i + 1);
  try { out[key] = execFileSync(os.homedir() + '/git/graphviz/build/cmd/dot/dot', ['-K' + eng, '-Tsvg'], { input: Buffer.from(src, 'latin1'), env: { ...process.env, GVBINDIR: '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all' }, stdio: ['pipe', 'pipe', 'ignore'], timeout: 60000 }).toString(); } catch (e) { out[key] = 'ERR'; }
}
fs.writeFileSync('sweep-native.json', JSON.stringify(out));
