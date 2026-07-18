# Research Decisions and Open Questions

## Decisions made during maintainer review

1. **Design Canon remains local-first open source.** Research tooling may use pinned development dependencies, but the published compiler and linter remain dependency-free unless a separate decision changes that boundary.
2. **The generic benchmark baseline must be a pinned artifact.** It is identified by version, provenance, size, and SHA-256 hash. It is not defined by an arbitrary token range.
3. **Official comparison runs require repetition.** The minimum single-model protocol is three repetitions per condition, producing 135 runs across 15 benchmarks.
4. **Generation manifests are immutable.** Blind human-evaluation results are stored separately.
5. **Failed and invalid runs remain visible.** They are not silently replaced or discarded.
6. **`AGENTS.md` is the default portable adapter target.** Native adapters may offer richer scoping where verified.
7. **Adapters are non-destructive.** Preview is the default, writes use managed blocks or generated files, and uninstall removes only Design Canon-owned content.
8. **Claude Code support uses `CLAUDE.md` or an import from it.** Claude Code must not be described as automatically loading `AGENTS.md`.
9. **Google DESIGN.md is a separate future adapter.** The current `design` compiler output is a Design Canon policy document, not a claim of Google-spec conformance.
10. **Fixture manifests report current facts separately from future goals.** Only current detector output appears in deterministic totals.
11. **QA certification requires evidence.** A written matrix or green Linux CI run does not certify Windows, WSL, macOS, filesystem-permission, or signal behavior.

## Open benchmark questions

1. What exact generic guidance artifact should become Condition B?
2. Which pinned browser-capture and accessibility toolchain should the local benchmark harness use?
3. What time, iteration, and tool budgets should each run receive?
4. Which prohibited-shortcut violations make a run invalid rather than merely penalized?
5. How will evaluators be recruited, blinded, and assigned to comparisons?
6. Will source maintainability receive a separate expert review?
7. Will the project publish any aggregate score, or only metric-specific and preference results?

## Open adapter questions

1. What final CLI names and flags should `init` and `uninstall` expose?
2. Should adapter-generated policy live directly in existing instruction files or in `.design-canon/` files imported by those instructions?
3. What managed-block conflict policy should apply when users edit generated sections?
4. Which Cursor and Windsurf activation modes should ship in the first stable adapter release?
5. What source supplies concrete tokens for a future Google DESIGN.md adapter?

## Open fixture and analysis questions

1. Which semantic rule should receive the first browser-backed analyzer?
2. How should detector-count changes be reviewed when broader matching is intentional?
3. Should intentionally bad fixtures remain plain HTML only, or should framework-specific fixtures be added later?

## Open QA questions

1. Which macOS environments are available for real execution evidence?
2. Should the manual matrix become a scriptable conformance harness?
3. What platform set is required before the first npm prerelease?
4. How should interrupted JSON-output behavior be documented or improved?

Each open question that changes a public API, schema, scoring policy, release boundary, or security posture requires an explicit maintainer decision before implementation.
