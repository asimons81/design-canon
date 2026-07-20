import { spawn } from 'node:child_process';
import { open, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { writeJson } from './lib.js';

export const EMPTY_USAGE = Object.freeze({ inputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null });
export const TOOL_ACTION_EVENT_TYPES = Object.freeze([
  'item.started:command_execution', 'item.started:mcp_tool_call', 'item.started:web_search', 'item.started:file_change'
]);

function summarize(events, malformed, incompleteFinalLine = null) {
  const eventTypes = {};
  const actionEventTypes = {};
  let resolvedModelIdentifier = null;
  let finalAssistantMessage = null;
  let usage = { ...EMPTY_USAGE };
  for (const event of events) {
    const itemType = event.item?.type ?? null;
    const type = itemType ? `${event.type}:${itemType}` : (event.type ?? 'unknown');
    eventTypes[type] = (eventTypes[type] ?? 0) + 1;
    if (TOOL_ACTION_EVENT_TYPES.includes(type)) actionEventTypes[type] = (actionEventTypes[type] ?? 0) + 1;
    const reported = event.usage ?? event.token_usage ?? event.response?.usage ?? null;
    if (reported) usage = {
      inputTokens: reported.input_tokens ?? reported.inputTokens ?? usage.inputTokens,
      cachedInputTokens: reported.cached_input_tokens ?? reported.cachedInputTokens ?? usage.cachedInputTokens,
      outputTokens: reported.output_tokens ?? reported.outputTokens ?? usage.outputTokens,
      reasoningTokens: reported.reasoning_tokens ?? reported.reasoningTokens ?? usage.reasoningTokens
    };
    resolvedModelIdentifier ??= event.model ?? event.response?.model ?? null;
    if (event.item?.type === 'agent_message' && typeof event.item.text === 'string') finalAssistantMessage = event.item.text;
  }
  return {
    schemaVersion: 2, eventCount: events.length, eventTypes,
    actionCount: Object.values(actionEventTypes).reduce((sum, count) => sum + count, 0),
    actionEventTypes, countedActionTypes: [...TOOL_ACTION_EVENT_TYPES], malformed,
    incompleteFinalLine, usage, resolvedModelIdentifier, finalAssistantMessage
  };
}

function parseLine(bytes, line, terminated, events, malformed) {
  const content = bytes.length && bytes.at(-1) === 13 ? bytes.subarray(0, -1) : bytes;
  if (!content.length || !content.toString('utf8').trim()) return;
  try { events.push(JSON.parse(content.toString('utf8'))); }
  catch (error) { malformed.push({ line, terminated, byteLength: content.length, bytesBase64: content.toString('base64'), error: error.message }); }
}

export function normalizeJsonl(bytes) {
  const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
  const events = [];
  const malformed = [];
  let start = 0;
  let line = 1;
  for (let index = 0; index < input.length; index += 1) if (input[index] === 10) {
    parseLine(input.subarray(start, index), line, true, events, malformed);
    start = index + 1;
    line += 1;
  }
  const tail = input.subarray(start);
  if (tail.length) parseLine(tail, line, false, events, malformed);
  return summarize(events, malformed, tail.length ? { line, byteLength: tail.length, bytesBase64: tail.toString('base64') } : null);
}

class IncrementalCounter {
  constructor(onAction) { this.tail = Buffer.alloc(0); this.line = 1; this.actionCount = 0; this.onAction = onAction; }
  push(chunk) {
    const input = Buffer.concat([this.tail, chunk]);
    let start = 0;
    for (let index = 0; index < input.length; index += 1) if (input[index] === 10) {
      const line = input.subarray(start, index).toString('utf8').replace(/\r$/, '');
      try {
        const event = JSON.parse(line);
        const type = event.item?.type ? `${event.type}:${event.item.type}` : event.type;
        if (TOOL_ACTION_EVENT_TYPES.includes(type)) { this.actionCount += 1; this.onAction(this.actionCount); }
      } catch {}
      start = index + 1;
      this.line += 1;
    }
    this.tail = input.subarray(start);
  }
}

export function classifyExecutionFailure(execution) {
  if (execution.spawnError?.code === 'ENOENT') return 'executable-not-found';
  if (execution.spawnError?.code === 'EACCES') return 'permission-denied';
  if (execution.actionBudgetExceeded) return 'tool-action-budget-exceeded';
  if (execution.timedOut) return 'wall-clock-timeout';
  if (execution.normalized.malformed.length) return 'malformed-jsonl';
  const stderr = String(execution.stderrText ?? '').toLowerCase();
  if (/not logged in|authentication|unauthorized/.test(stderr)) return 'authentication-failure';
  if (/invalid model|model.*not (found|supported)/.test(stderr)) return 'invalid-model';
  if (/reasoning.*(invalid|unsupported)/.test(stderr)) return 'unsupported-reasoning-setting';
  if (/approval.*(invalid|unsupported)/.test(stderr)) return 'invalid-approval-setting';
  if (execution.exitCode !== 0 || execution.exitSignal) return execution.exitSignal ? 'signal-termination' : 'nonzero-exit';
  return null;
}

export function finalizeExecutionManifest(manifest, execution) {
  const invalidReason = classifyExecutionFailure(execution);
  return {
    ...manifest, status: invalidReason ? (execution.sourceMayBePartial ? 'partial' : 'failed') : 'complete',
    startedAt: execution.startedAt, completedAt: execution.endedAt, runtimeMs: execution.runtimeMs,
    actionCount: execution.normalized.actionCount, usage: execution.normalized.usage,
    execution: {
      exitCode: execution.exitCode, exitSignal: execution.exitSignal, spawnError: execution.spawnError,
      timedOut: execution.timedOut, actionBudgetExceeded: execution.actionBudgetExceeded,
      terminationSignal: execution.terminationSignal, malformedJsonlLines: execution.normalized.malformed.length,
      completionClass: invalidReason ? (execution.sourceMayBePartial ? 'partial' : 'failed') : 'executed'
    },
    resolvedModelIdentifier: execution.normalized.resolvedModelIdentifier, invalidReason
  };
}

async function terminateTree(child, graceMs) {
  if (!child.pid || child.exitCode !== null) return null;
  if (process.platform === 'win32') {
    await new Promise((resolve) => spawn('taskkill', ['/PID', String(child.pid), '/T'], { stdio: 'ignore' }).once('exit', resolve));
  } else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  await Promise.race([new Promise((resolve) => child.once('close', resolve)), new Promise((resolve) => setTimeout(resolve, graceMs))]);
  if (child.exitCode === null) {
    if (process.platform === 'win32') await new Promise((resolve) => spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).once('exit', resolve));
    else { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
    return 'SIGTERM+SIGKILL';
  }
  return 'SIGTERM';
}

async function copyStreamLosslessly(readable, handle, onChunk = null) {
  if (!readable) return;
  for await (const chunk of readable) {
    const bytes = Buffer.from(chunk);
    await handle.write(bytes);
    onChunk?.(bytes);
  }
  await handle.sync();
}

export async function executeJsonlProcess({ executable, args, cwd, stdin, rawStdoutPath, stderrPath, normalizedPath, timeoutMs, killGraceMs, actionBudget, env }) {
  await Promise.all([mkdir(dirname(rawStdoutPath), { recursive: true }), mkdir(dirname(stderrPath), { recursive: true })]);
  const stdoutHandle = await open(rawStdoutPath, 'wx');
  const stderrHandle = await open(stderrPath, 'wx');
  const startedAt = new Date().toISOString();
  const start = Date.now();
  let child;
  let spawnError = null;
  let timedOut = false;
  let actionBudgetExceeded = false;
  let terminationSignal = null;
  let terminating = false;
  const stop = async (reason) => {
    if (terminating || !child) return;
    terminating = true;
    if (reason === 'timeout') timedOut = true;
    if (reason === 'action-budget') actionBudgetExceeded = true;
    terminationSignal = await terminateTree(child, killGraceMs);
  };
  const counter = new IncrementalCounter((count) => { if (count > actionBudget) void stop('action-budget'); });
  let exit = { code: null, signal: null };
  try {
    child = spawn(executable, args, { cwd, env, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const settled = new Promise((resolve) => {
      let done = false;
      child.once('error', (error) => { if (!done) { done = true; spawnError = { code: error.code ?? null, message: error.message }; resolve({ code: null, signal: null }); } });
      child.once('close', (code, signal) => { if (!done) { done = true; resolve({ code, signal }); } });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
    const outputPromises = [copyStreamLosslessly(child.stdout, stdoutHandle, (bytes) => counter.push(bytes)), copyStreamLosslessly(child.stderr, stderrHandle)];
    const timer = setTimeout(() => void stop('timeout'), timeoutMs);
    exit = await settled.finally(() => clearTimeout(timer));
    await Promise.all(outputPromises);
  } catch (error) {
    spawnError = { code: error.code ?? null, message: error.message };
  } finally {
    await Promise.all([stdoutHandle.close(), stderrHandle.close()]);
  }
  const [raw, stderr] = await Promise.all([readFile(rawStdoutPath), readFile(stderrPath)]);
  const normalized = normalizeJsonl(raw);
  await writeJson(normalizedPath, normalized);
  return {
    startedAt, endedAt: new Date().toISOString(), runtimeMs: Date.now() - start,
    exitCode: exit.code, exitSignal: exit.signal, spawnError, timedOut, actionBudgetExceeded,
    terminationSignal: terminationSignal ?? exit.signal, normalized, stderrText: stderr.toString('utf8'),
    sourceMayBePartial: Boolean(spawnError || timedOut || actionBudgetExceeded || exit.code !== 0 || exit.signal || normalized.malformed.length)
  };
}
