# B000 Runner Contract Amendment 2

## Status and scope

This amendment applies only to the nonofficial, claim-ineligible B000 calibration. It does not modify protocol v1, authorize B001-B015, or make any benchmark result claim-eligible.

## Canonical model identifier

The previously frozen requested identifier gpt-5.6 was rejected before inference by Codex CLI 0.144.4 under the dedicated ChatGPT-authenticated account. A distinct, nonmeasured admission diagnostic then requested the canonical identifier gpt-5.6-sol with medium reasoning and the Standard/default service tier. That request completed successfully with zero tool actions and an unchanged workspace.

The canonical identifier therefore replaces the rejected alias:

- Requested model: gpt-5.6-sol
- Display name: GPT-5.6 Sol
- Reasoning effort: medium
- Reasoning label: Standard
- Service tier: default

Codex did not expose a resolved model identifier in the diagnostic JSONL. The successful request proves that the canonical identifier and frozen settings were accepted; it does not establish an immutable provider snapshot.

## Skill visibility clarification

Runtime-created Codex skill cache files may exist in the isolated CODEX_HOME, but no skill instructions, metadata, or capabilities may be exposed to the measured model context.

Every B000 child must include the accepted session override skills.include_instructions=false and disable the skill_mcp_dependency_install capability in addition to the existing integration-feature disables. Before admission, provider-free codex debug prompt-input evidence must show no skills instruction block, skill name, skill description, skill path, skill invocation instruction, MCP definition, plugin definition, project instruction, or prior-session content.

Cache-directory absence alone is not evidence of zero skill visibility. If the prompt-input surface is unavailable, the override is rejected, or any skill content or capability remains visible, B000 retains STOP.

## Effective command amendment

The reviewed command shape from Amendment 1 remains authoritative, with these replacements and additions:

~~~text
codex --ask-for-approval never exec \
  --model gpt-5.6-sol \
  ... \
  --disable skill_mcp_dependency_install \
  --config skills.include_instructions=false \
  -
~~~

All other isolation, evidence, ordering, retry, budget, and failure-preservation requirements remain unchanged.
