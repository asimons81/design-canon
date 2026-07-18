# Contributing

Design Canon welcomes rules, profiles, detectors, fixtures, adapters, and benchmark tasks.

## Rule Requirements

A proposed rule must be:

- scoped to the surfaces where it applies
- written as an actionable instruction
- accompanied by a rationale
- paired with observable verification
- explicit about whether a detector is definitive or heuristic
- free of copied proprietary prompt text

A rule that says only “make it look better” is not a rule.

## Development

```bash
npm test
node ./bin/design-canon.js compile --profile marketing --target design
node ./bin/design-canon.js lint ./examples/sloppy --profile marketing
```

Open an issue before adding a broad aesthetic prohibition. Contextual defaults should not become universal dogma by accident.
