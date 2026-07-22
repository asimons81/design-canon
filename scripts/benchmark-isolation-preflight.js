#!/usr/bin/env node
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createOpaqueWorkspace } from '../research/benchmark/harness/b000.js';
import { buildCodexExecArgs, codexPreflight, deriveCodexCapabilities, effectiveCommandHash } from '../research/benchmark/harness/codex-adapter.js';
import { assertIsolationEvidence, generateIsolationEvidence, grantAgentWorkspaceAccess, revokeAgentWorkspaceAccess, SAFE_AGENT_ENVIRONMENT } from '../research/benchmark/harness/isolation.js';
import { parseCliArgs, REPOSITORY_ROOT } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': { required: true }, '--workspace-root': { required: true },
    '--codex': { required: false, default: '/usr/local/bin/codex' }
  });
  const output = resolve(options['--output']);
  const workspaceRoot = resolve(options['--workspace-root']);
  await mkdir(output, { recursive: false, mode: 0o700 });
  const preflight = await codexPreflight({ executable: options['--codex'], evidenceDirectory: output, env: SAFE_AGENT_ENVIRONMENT });
  if (!preflight.passed) throw new Error('Codex preflight failed.');
  const capabilities = deriveCodexCapabilities(
    await readFile(join(output, 'codex-help.txt'), 'utf8'),
    await readFile(join(output, 'codex-exec-help.txt'), 'utf8')
  );
  const created = await createOpaqueWorkspace({ workspaceRoot, repositoryRoot: REPOSITORY_ROOT });
  const sibling = join(workspaceRoot, `.preflight-sibling-${process.pid}`);
  await mkdir(sibling, { mode: 0o700 });
  let granted = false;
  try {
    await grantAgentWorkspaceAccess(created.workspace);
    granted = true;
    const args = buildCodexExecArgs({ workspace: created.workspace }, capabilities);
    const hash = effectiveCommandHash(options['--codex'], args);
    const evidence = await generateIsolationEvidence({
      runId: 'B000-isolation-preflight', workspace: created.workspace, workspaceRoot,
      siblingWorkspace: sibling, repositoryRoot: REPOSITORY_ROOT, evidenceDirectory: output,
      codexExecutable: options['--codex'], codexVersion: preflight.version, effectiveCommandHash: hash
    });
    await assertIsolationEvidence(evidence, { runId: 'B000-isolation-preflight', workspace: created.workspace, effectiveCommandHash: hash });
    process.stdout.write(`${JSON.stringify({ passed: true, evidenceSha256: evidence.evidenceSha256, probes: Object.keys(evidence.probes) }, null, 2)}\n`);
  } finally {
    if (granted) await revokeAgentWorkspaceAccess(created.workspace).catch(() => {});
    await rm(sibling, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(`benchmark-isolation-preflight: ${error.message}`); process.exitCode = 1; });
