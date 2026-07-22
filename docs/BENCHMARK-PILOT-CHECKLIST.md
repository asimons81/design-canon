# Benchmark Pilot and Release Checklist

This checklist separates completed tooling and calibration from evidence that still requires official model execution, independent humans, or package publication.

## Tooling complete

- [x] Four-condition clean-room protocol
- [x] Immutable protocol-v1 catalog snapshot
- [x] Pinned generic-guidance baseline
- [x] Frozen profile selectors
- [x] Deterministic monolith and compiled guidance artifacts
- [x] 180-run randomized plan generator
- [x] Immutable run initialization
- [x] Desktop and mobile local Chromium capture
- [x] Viewport and full-page screenshots
- [x] Horizontal-overflow and console-error evidence
- [x] Design Canon browser lint attachment
- [x] Calibration DOM accessibility evidence
- [x] Artifact hashing and manifest finalization
- [x] Blind assignment and confidential-key generation
- [x] Vote analysis and objective reporting
- [x] Safe adapters for AGENTS.md, Claude Code, Cursor, Windsurf, Codex, and Hermes
- [x] Three public demonstration briefs selected before output inspection

## B000 calibration complete

- [x] Freeze a claim-ineligible B000 shakedown brief
- [x] Freeze GPT-5.6 Sol Standard and Codex settings
- [x] Freeze budgets and deterministic A, B, D, C order
- [x] Define the fail-closed runner and evidence contract
- [x] Lock Phase-1 boundaries with repository tests
- [x] Implement the provider-neutral execution state layer
- [x] Implement and test the Codex CLI adapter without paid calls
- [x] Prove workspace, instruction, state, and network isolation
- [x] Execute B000 A, B, D, and C once with no automatic retries in r2
- [x] Capture and validate every launched B000 r2 artifact
- [x] Audit measured usage, runtime, actions, failures, and exposed cost fields
- [x] Propose B001 candidate budgets and runtime settings
- [x] Issue a `GO` decision for the runner

B000 remains nonofficial and claim-ineligible. Its `GO` recommendation validates the runner and evidence pipeline only. It did not select a subjective winner, admit protocol-v1 runs, or authorize B001-B015.

The failed r1 series remains immutable diagnostic evidence and is excluded from r2 totals and claims. The consumed r2 attempt IDs must not be reused.

## Decisions required before an official pilot

- [ ] Pin one exact official model and resolved model identity
- [ ] Pin one official agent framework and version
- [ ] Pin tokenizer identity and record B/C/D token counts
- [ ] Pin context-window size and prove all four conditions fit without truncation
- [ ] Admit final time, action, and iteration budgets under a reviewed protocol update
- [ ] Pin provider-supported sampling controls
- [ ] Choose and pin the official accessibility scanner
- [ ] Decide whether the built-in calibration audit remains supplementary only
- [ ] Pin the execution environment and container or machine image for official runs
- [ ] Commit protocol admission fields before inspecting official results
- [ ] Approve the exact provider call count and spend estimate

B000 produced candidate B001 limits of 420 seconds and eight tool actions per run. These are recommendations, not automatic authorization.

## Pilot execution

- [ ] Prepare guidance for the B001 marketing profile
- [ ] Generate the complete run plan
- [ ] Initialize B001 A/B/C/D repetitions 1 through 3
- [ ] Execute runs in the preregistered order
- [ ] Preserve complete, partial, failed, and invalid runs
- [ ] Capture all required render artifacts
- [ ] Validate every artifact hash and manifest
- [ ] Generate blind assignments
- [ ] Recruit independent evaluators who did not conduct the runs
- [ ] Analyze objective and preference outcomes separately
- [ ] Amend the protocol only under a new version

No item in this section is authorized merely because B000 completed.

## Full-study gate

Do not claim that compiled Design Canon outperforms monolithic guidance until:

1. all 180 planned runs are accounted for;
2. failures and exclusions are disclosed;
3. instruction efficiency and accessibility outcomes are reported;
4. blind preferences include uncertainty estimates;
5. raw anonymized artifacts and analysis code are published;
6. the claim is limited to the tested clean-room monolithic architecture, not an untested private corpus.

## Package release gate

- [x] Merge the alpha.1 implementation and calibration work with green CI
- [x] Update alpha.1 changelog and package manifests
- [x] Create immutable source tag `v0.1.0-alpha.1`
- [x] Add a tokenless GitHub OIDC publishing workflow for use after npm bootstrap
- [x] Confirm the package allowlist excludes benchmark outputs and private blind keys
- [ ] Complete repository maintenance and documentation verification
- [ ] Run clean tarball installation on Windows, macOS, Linux, and WSL
- [ ] Confirm `init` and `uninstall` are idempotent on every adapter in the packaged artifact
- [ ] Prepare `0.1.0-alpha.2` as the next package candidate
- [ ] Perform the one-time, two-factor-authenticated npm bootstrap publication under `next`
- [ ] Verify registry integrity, shasum, dist-tags, package contents, and clean installation
- [ ] Configure npm trusted publishing for `.github/workflows/publish.yml`
- [ ] Publish the matching GitHub prerelease
- [ ] Publish a later provenance-backed npm prerelease through the trusted workflow
- [ ] Publish the three demonstrations only after their complete artifacts exist

The alpha.1 source tag is not evidence that npm publication completed. See [`RELEASE_STATUS.md`](RELEASE_STATUS.md).
