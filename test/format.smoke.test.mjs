// End-to-end smoke test for the PromQL formatter WASM module.
//
// The exported `parsepromql(query, type)` is DOM-coupled: it writes the result
// into the #resultDiv element rather than returning a value. So we boot the
// real wasm under a jsdom document and assert on the rendered output.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Boot a fresh WASM instance against a jsdom document and return that document.
async function bootWasm() {
  const dom = new JSDOM(`<!DOCTYPE html><body>
    <button id="runButton"></button>
    <button id="exampleButton"></button>
    <div id="loadingWarning"></div>
    <textarea id="promqlInput"></textarea>
    <div id="resultDiv"></div>
  </body>`);

  // syscall/js reaches the DOM through globalThis.document.
  globalThis.document = dom.window.document;

  // wasm_exec.js is an IIFE that assigns globalThis.Go.
  const wasmExec = await readFile(join(root, 'src', 'wasm_exec.js'), 'utf8');
  vm.runInThisContext(wasmExec);

  const go = new globalThis.Go();
  const bytes = await readFile(join(root, 'src', 'promqlparser.wasm'));
  const { instance } = await WebAssembly.instantiate(bytes, go.importObject);

  // main() registers the globals then blocks on a channel, so do NOT await run().
  go.run(instance);
  await new Promise((resolve) => setImmediate(resolve));

  return dom.window.document;
}

test('parsepromql prettifies a valid query', async () => {
  const doc = await bootWasm();
  assert.equal(typeof globalThis.parsepromql, 'function', 'parsepromql global is registered');

  globalThis.parsepromql('sum(rate(http_requests_total[5m]))by(job)', 'vic');

  const html = doc.getElementById('resultDiv').innerHTML;
  assert.match(html, /Prettified PromQL/);
  assert.doesNotMatch(html, /Parsing error/);
});

test('parsepromql reports a parsing error for invalid input', async () => {
  const doc = await bootWasm();

  globalThis.parsepromql('sum(', 'vic');

  const html = doc.getElementById('resultDiv').innerHTML;
  assert.match(html, /Parsing error/);
});
