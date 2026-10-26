// SPDX-License-Identifier: EPL-2.0
// One bytediff job in its own process: node bd-job.ts <bundle> <file> <engine> <format>
// (run by Node's built-in type stripping: no imports of local modules, erasable syntax only).
// Writes the output, then "\n--stderr--\n" and every captured console line, to stdout.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

interface Bundle {
  renderSvg(src: string, engine: string): string;
  render(graph: unknown, format: string, opts: { engine: string }): string;
  parse(src: string): unknown;
}

const [bundle = '', file = '', engine = '', format = ''] = process.argv.slice(2);
function decode(buf: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return buf.toString('latin1');
  }
}
const src = decode(fs.readFileSync(file));
const DE = (await import(pathToFileURL(bundle).href)) as Bundle;
const sink: string[] = [];
for (const k of ['log', 'warn', 'error', 'info', 'debug'] as const) {
  console[k] = (...a: unknown[]): void => {
    sink.push(a.join(' '));
  };
}
let out: string;
try {
  out = format === 'svg' ? DE.renderSvg(src, engine) : DE.render(DE.parse(src), format, { engine });
} catch (e) {
  out = `THROW ${e instanceof Error ? e.message : String(e)}`;
}
process.stdout.write(`${out}\n--stderr--\n${sink.join('\n')}`, () => process.exit(0));
