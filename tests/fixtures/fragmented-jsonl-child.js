#!/usr/bin/env node
const count = Number(process.env.FRAGMENT_COUNT ?? 2000);
const lines = [];
for (let index = 0; index < count; index += 1) lines.push(JSON.stringify({ type: 'item.started', item: { type: 'command_execution', id: `€-${index}` } }));
lines.push('{malformed');
const complete = Buffer.from(`${lines.join('\n')}\n`, 'utf8');
const tail = Buffer.from('{"type":"item.completed","item":{"type":"agent_message","text":"tail €"}}', 'utf8');
const expected = Buffer.concat([complete, tail]);
let offset = 0;
let size = 1;
while (offset < expected.length) {
  const end = Math.min(expected.length, offset + size);
  if (!process.stdout.write(expected.subarray(offset, end))) await new Promise((resolve) => process.stdout.once('drain', resolve));
  offset = end;
  size = size === 17 ? 1 : size + 1;
  if (offset % 997 === 0) await new Promise((resolve) => setTimeout(resolve, 1));
}
