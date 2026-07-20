import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { writeJson } from './lib.js';

export const EMPTY_USAGE = Object.freeze({
  inputTokens: null,
  cachedInputTokens: null,
  outputTokens: null,
  reasoningTokens: null
});

export const TOOL_ACTION_EVENT_TYPES = Object.freeze([
  'item.started:command_execution',
  'item.started:mcp_tool_call',
  'item.started:web_search',
  'item.started:file_change'
]);

export function normalizeJsonl(bytes) {
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const events = [];
  const malformed = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      malformed.push({ line: index + 1, error: error.message });
    }
  }
  const eventTypes = {};
  const actionEventTypes = {};
  let resolvedModelIdentifier = null;
  let usage = { ...EMPTY_USAGE };
  for (const event of events) {
    const itemType = event.item?.type ?? null;
    const type = itemType ? `${event.type}:${itemType}` : (event.type ?? 'unknown');
    eventTypes[type] = (eventTypes[type] ?? 0) + 1;
    if (TOOL_ACTION_EVENT_TYPES.includes(type)) {
      actionEventTypes[type] = (actionEventTypes[type] ?? 0) + 1;
    }
    const reported = event.usage ?? event.token_usage ?? event.response?.usage ?? null;
    if (reported) {
      usage = {
        inputTokens: reported.input_tokens ?? reported.inputTokens ?? usage.inputTokens,
        cachedInputTokens: reported.cached_input_tokens ?? reported.cachedInputTokens ?? usage.cachedInputTokens,
        outputTokens: reported.output_tokens ?? reported.outputTokens ?? usage.outputTokens,
        reasoningTokens: reported.reasoning_tokens ?? reported.reasoningTokens ?? usage.reasoningTokens
      };
    }
    resolvedModelIdentifier ??= event.model ?? event.response?.model ?? null;
  }
  return {
    schemaVersion: 1,
    eventCount: events.length,
    eventTypes,
    actionCount: Object.values(actionEventTypes).reduce((sum, count) => sum + count, 0),
    actionEventTypes,
    countedActionTypes: [...TOOL_ACTION_EVENT_TYPES],
    malformed,
    usage,
    resolvedModelIdentifier
  };
}

export function finalizeExecutionManifest(manifest, execution) {
  const failed = execution.timedOut || execution.actionBudgetExceeded ||
    execution.exitCode !== 0 || execution.normalized.malformed.length > 0;
  return {
    ...manifest,
    status: failed ? (execution.sourceMayBePartial ? 'partial' : 'failed') : 'running',
    startedAt: execution.startedAt,
    completedAt: execution.endedAt,
    runtimeMs: execution.runtimeMs,
    actionCount: execution.normalized.actionCount,
    usage: execution.normalized.usage,
    execution: {
      exitCode: execution.exitCode,
      timedOut: execution.timedOut,
      actionBudgetExceeded: execution.actionBudgetExceeded,
      terminationSignal: execution.terminationSignal,
      malformedJsonlLines: execution.normalized.malformed.length,
      completionClass: failed ? (execution.sourceMayBePartial ? 'partial' : 'failed') : 'executed'
    },
    resolvedModelIdentifier: execution.normalized.resolvedModelIdentifier,
    invalidReason: execution.actionBudgetExceeded
      ? 'tool-action-budget-exceeded'
      : execution.timedOut
        ? 'wall-clock-timeout'
        : execution.normalized.malformed.length > 0
          ? 'malformed-jsonl'
          : execution.exitCode === 0 ? null : 'nonzero-exit'
  };
}

async function terminateTree(child, graceMs) {
  if (!child.pid || child.exitCode !== null) return null;
  const signal = process.platform === 'win32' ? 'taskkill/T' : 'SIGTERM';
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T'], { stdio: 'ignore' });
    await new Promise((resolve) => killer.once('exit', resolve));
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  }
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, graceMs))
  ]);
  if (child.exitCode === null) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      await new Promise((resolve) => killer.once('exit', resolve));
    } else {
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    }
    return `${signal}+force`;
  }
  return signal;
}

export async function executeJsonlProcess({
  executable,
  args,
  cwd,
  stdin,
  rawStdoutPath,
  stderrPath,
  normalizedPath,
  timeoutMs,
  killGraceMs,
  actionBudget,
  env
}) {
  await Promise.all([
    mkdir(dirname(rawStdoutPath), { recursive: true }),
    mkdir(dirname(stderrPath), { recursive: true })
  ]);
  await Promise.all([writeFile(rawStdoutPath, Buffer.alloc(0)), writeFile(stderrPath, Buffer.alloc(0))]);
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const child = spawn(executable, args, {
    cwd,
    env,
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  let stdout = Buffer.alloc(0);
  let actionBudgetExceeded = false;
  let timedOut = false;
  let terminationSignal = null;
  let terminating = false;
  const stop = async (reason) => {
    if (terminating) return;
    terminating = true;
    if (reason === 'timeout') timedOut = true;
    if (reason === 'action-budget') actionBudgetExceeded = true;
    terminationSignal = await terminateTree(child, killGraceMs);
  };
  child.stdout.on('data', (chunk) => {
    const bytes = Buffer.from(chunk);
    stdout = Buffer.concat([stdout, bytes]);
    void appendFile(rawStdoutPath, bytes);
    if (normalizeJsonl(stdout).actionCount > actionBudget) void stop('action-budget');
  });
  child.stderr.on('data', (chunk) => void appendFile(stderrPath, Buffer.from(chunk)));
  child.stdin.end(stdin);
  const timer = setTimeout(() => void stop('timeout'), timeoutMs);
  const exit = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  }).finally(() => clearTimeout(timer));
  const normalized = normalizeJsonl(await readFile(rawStdoutPath));
  await writeJson(normalizedPath, normalized);
  return {
    startedAt,
    endedAt: new Date().toISOString(),
    runtimeMs: Date.now() - start,
    exitCode: exit.code,
    timedOut,
    actionBudgetExceeded,
    terminationSignal: terminationSignal ?? exit.signal,
    normalized,
    sourceMayBePartial: timedOut || actionBudgetExceeded || exit.code !== 0
  };
}
