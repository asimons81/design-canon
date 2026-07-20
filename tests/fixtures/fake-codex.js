#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args[0] === '--version') {
  process.stdout.write(`codex-cli ${process.env.FAKE_CODEX_VERSION ?? '0.144.0'}\n`);
  process.exit(0);
}
if (args[0] === 'exec' && args.includes('--help')) {
  const missing = process.env.FAKE_CODEX_MISSING_FLAG;
  const flags = [
    '--cd', '--model', '--sandbox', '--ask-for-approval', '--ignore-user-config',
    '--ignore-rules', '--ephemeral', '--strict-config', '--json', '--output-last-message', '--config'
  ].filter((flag) => flag !== missing);
  process.stdout.write(`Usage: codex exec [OPTIONS] [PROMPT]\n${flags.join('\n')}\n`);
  process.exit(0);
}
const scenario = process.env.FAKE_CODEX_SCENARIO ?? 'success';
const workspace = args[args.indexOf('--cd') + 1] ?? process.cwd();
const output = args[args.indexOf('--output-last-message') + 1];
const source = {
  'index.html': '<!doctype html><html lang="en"><title>Fake</title><main><h1>Fake</h1></main></html>',
  'styles.css': 'body{font-family:sans-serif}',
  'script.js': 'void 0;'
};
if (!['missing-files', 'timeout'].includes(scenario)) {
  for (const [name, content] of Object.entries(source)) await writeFile(join(workspace, name), content);
}
if (scenario === 'missing-files') await writeFile(join(workspace, 'index.html'), source['index.html']);
if (scenario === 'forbidden-file') await writeFile(join(workspace, 'extra.txt'), 'forbidden');
if (scenario === 'path-escape') await writeFile(join(workspace, '..', 'escaped.txt'), 'escape');
process.stdout.write(`${JSON.stringify({ type: 'thread.started', model: 'gpt-5.6-test' })}\n`);
if (scenario === 'malformed') process.stdout.write('{bad json\n');
const actions = scenario === 'action-budget' ? 81 : 1;
for (let i = 0; i < actions; i += 1) {
  process.stdout.write(`${JSON.stringify({ type: 'item.started', item: { type: 'command_execution', id: String(i) } })}\n`);
}
if (scenario === 'timeout') await new Promise(() => setInterval(() => {}, 1000));
if (output) await writeFile(output, 'fake final message');
if (scenario !== 'missing-usage') {
  process.stdout.write(`${JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 3, output_tokens: 7, reasoning_tokens: 2 } })}\n`);
}
process.exit(scenario === 'nonzero' ? 7 : 0);
