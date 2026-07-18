# Research Contract Templates

These files demonstrate the candidate intake contract. They are examples, not accepted rules or fixtures.

## Workflow

1. Create or reuse one or more source records.
2. Create a proposal that references those source IDs.
3. Create violation, control, and borderline fixture manifests.
4. Run the repository test suite.
5. Open a draft research pull request.
6. Stop at `review-ready`. Maintainers decide stable rule IDs, severity, profile membership, and detector implementation.

## Naming

- source: `source.<type>.<slug>.json`
- proposal: `proposal.<category>.<slug>.json`
- fixture: `fixture.<proposal-path>.<case-type>.<slug>`

Do not place candidate material in `rules/core.json` or accepted profiles.
