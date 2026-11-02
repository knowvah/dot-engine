import fs from 'node:fs';
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const diff = Object.keys(a).filter((k) => a[k] !== b[k]);
console.log('total', Object.keys(a).length, 'diff', diff.length);
console.log(diff.slice(0, 40).join('\n'));
