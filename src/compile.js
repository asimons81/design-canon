import { writeFile } from 'node:fs/promises';
import { loadCatalog, loadProfile } from './io.js';
import { selectRules } from './select.js';

const TARGET_TITLES = {
  design: 'DESIGN.md',
  skill: 'Design Canon Agent Skill',
  agents: 'Design Canon Instructions'
};

function renderRule(rule) {
  const lines = [`### ${rule.title}`, '', rule.instruction];
  if (rule.rationale) lines.push('', `**Why:** ${rule.rationale}`);
  if (rule.verify?.length) {
    lines.push('', '**Verify:**');
    for (const check of rule.verify) lines.push(`- ${check}`);
  }
  return lines.join('\n');
}

export function renderCompiled({ profile, rules, target }) {
  const title = TARGET_TITLES[target];
  if (!title) throw new Error(`Unknown target '${target}'. Use design, skill, or agents.`);

  const required = rules.filter((rule) => rule.severity === 'error');
  const guidance = rules.filter((rule) => rule.severity !== 'error');
  const preamble = target === 'skill'
    ? `---\nname: design-canon-${profile.id}\ndescription: Enforces the ${profile.name} Design Canon while planning, implementing, and reviewing interfaces.\n---\n\n# ${title}`
    : `# ${title}`;

  return `${preamble}\n\n> Compiled by Design Canon for the **${profile.name}** profile.\n> Load only the rules relevant to this surface. Do not treat generic style bans as universal truth.\n\n## Intent\n\n${profile.intent}\n\n## Working Method\n\n1. Identify the interface's purpose, audience, and primary action before choosing an aesthetic.\n2. Establish one explicit visual direction and a small token system before implementing components.\n3. Build the hierarchy and layout first. Decoration comes after the information architecture works.\n4. Run mechanical lint checks, inspect the rendered interface, and record intentional exceptions.\n\n## Required Rules\n\n${required.map(renderRule).join('\n\n')}\n\n## Contextual Guidance\n\n${guidance.map(renderRule).join('\n\n')}\n\n## Completion Gate\n\n- The interface has a named visual direction, not a pile of fashionable effects.\n- Typography, spacing, color, radius, and depth use a coherent token system.\n- The page has been checked at narrow and wide viewports.\n- Keyboard focus remains visible and interactive targets are usable.\n- Any suppressed lint rule includes a written design reason.\n- A rendered screenshot has been reviewed before declaring the work complete.\n`;
}

export async function compileCommand({ profile: profileName, target, output }) {
  const [catalog, profile] = await Promise.all([loadCatalog(), loadProfile(profileName)]);
  const rules = selectRules(catalog, profile);
  const content = renderCompiled({ profile, rules, target });

  if (output) {
    await writeFile(output, content, 'utf8');
    console.log(`Compiled ${rules.length} rules for '${profile.id}' into ${output}`);
  } else {
    process.stdout.write(content);
  }
  return { content, rules, profile };
}
