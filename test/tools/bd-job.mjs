// SPDX-License-Identifier: EPL-2.0
// One bytediff job in its own process: node bd-job.mjs <bundle> <file> <engine> <format>
// Writes the output, then "\n--stderr--\n" and every captured console line, to stdout.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [bundle, file, engine, format] = process.argv.slice(2);
function decode(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return buf.toString('latin1'); }
}
const src = decode(fs.readFileSync(file));
const DE = await import(pathToFileURL(bundle).href);
const sink = [];
for (const k of ['log', 'warn', 'error', 'info', 'debug']) console[k] = (...a) => sink.push(a.join(' '));
let out;
try { out = format === 'svg' ? DE.renderSvg(src, engine) : DE.render(DE.parse(src), format, { engine }); }
catch (e) { out = `THROW ${e && e.message}`; }
process.stdout.write(`${out}\n--stderr--\n${sink.join('\n')}`, () => process.exit(0));
