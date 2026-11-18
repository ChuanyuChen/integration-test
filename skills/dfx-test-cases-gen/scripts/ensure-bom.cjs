#!/usr/bin/env node
/**
 * ensure-bom.cjs — ensure the CSV file starts with a UTF-8 BOM (EF BB BF).
 *
 * Background: when Excel/WPS opens a UTF-8 CSV without a BOM, it decodes the
 * file with the system ANSI code page (GBK on a Chinese Windows), so CJK text
 * shows as mojibake; with a BOM the file is decoded as UTF-8 and displays
 * correctly.
 *
 * Behavior:
 *   - Already has a BOM: no change (idempotent, safe to re-run)
 *   - No BOM and the content is valid UTF-8: write the BOM
 *   - Not UTF-8 (e.g. GBK): report an error and refuse to process
 *     (adding a BOM would only make it worse)
 *
 * Usage:
 *   node ensure-bom.cjs <csv-path> [more-csv-paths...]
 *
 * Exit code: 0 when all succeed; 1 when any fails.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function ensureBom(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (err) {
    return { ok: false, changed: false, message: `cannot read file: ${err.message}` };
  }

  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { ok: true, changed: false, message: 'already has a BOM; nothing to do' };
  }

  // A non-UTF-8 file (e.g. saved as GBK) only gets worse with a BOM; refuse to process
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return {
      ok: false,
      changed: false,
      message: 'file is not valid UTF-8 (possibly GBK/ANSI); convert the encoding to UTF-8 first',
    };
  }

  fs.writeFileSync(file, Buffer.concat([BOM, buf]));
  return { ok: true, changed: true, message: 'UTF-8 BOM written' };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node ensure-bom.cjs <csv-path> [more-csv-paths...]');
    process.exitCode = 1;
    return;
  }

  let failed = false;
  for (const arg of args) {
    const file = path.resolve(arg);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      failed = true;
      console.error(`[FAIL] ${arg}: file does not exist or is not a regular file`);
      continue;
    }
    const result = ensureBom(file);
    if (!result.ok) failed = true;
    console.log(`[${result.ok ? 'OK' : 'FAIL'}] ${arg}: ${result.message}`);
  }
  if (failed) process.exitCode = 1;
}

main();
