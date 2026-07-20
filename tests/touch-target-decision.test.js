import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const R=dirname(fileURLToPath(import.meta.url));
const P=(...x)=>join(R,'..',...x);
async function load(){const [adr,spec,matrix,catalog]=await Promise.all([
readFile(P('docs','decisions','ADR-004-rendered-touch-target-rule.md'),'utf8'),
readFile(P('research','decisions','F020-rendered-touch-targets.json'),'utf8').then(JSON.parse),
readFile(P('research','decisions','candidate-production-architecture.json'),'utf8').then(JSON.parse),
readFile(P('rules','core.json'),'utf8').then(JSON.parse)]);return{adr,spec,matrix,catalog};}
test('ADR-004 accepts F020 identity',async()=>{const{adr,spec}=await load();assert.match(adr,/Status:\*\* Accepted/);assert.equal(spec.ruleNumber,'F020');assert.equal(spec.proposalId,'proposal.mobile.touch-target-minimum');assert.equal(spec.ruleId,'mobile.touch-target-minimum');assert.equal(spec.analyzerId,'rendered.touch-target-size');assert.equal(spec.severity,'warning');});
test('uses WCAG 2.5.8 24px contract, not 44px enhanced',async()=>{const{adr,spec}=await load();assert.equal(spec.normativeBasis.minimumWidthCssPx,24);assert.equal(spec.normativeBasis.minimumHeightCssPx,24);assert.equal(spec.normativeBasis.spacingCircleDiameterCssPx,24);assert.equal(spec.normativeBasis.comparison,'full-precision-no-rounding');assert.match(adr,/2\.5\.5/);});
test('spacing algorithm is exact',async()=>{const{spec}=await load();assert.equal(spec.spacing.radiusCssPx,12);assert.equal(spec.spacing.circleCircle,'center-distance < 24');assert.equal(spec.spacing.circleTarget,'distance-to-target-area < 12');assert.equal(spec.spacing.exactTangencyIntersects,false);});
test('exceptions are conservative',async()=>{const{spec}=await load();assert.equal(spec.exceptions.inline.automatic,'narrow');assert.equal(spec.exceptions.equivalent.automatic,false);assert.equal(spec.exceptions.essential.automatic,false);assert.equal(spec.exceptions.userAgentControl.automatic,'unmodified-native-only');});
test('geometry boundaries are fixed',async()=>{const{spec}=await load();assert.equal(spec.geometry.primary,'getBoundingClientRect');assert.equal(spec.geometry.fragments,'getClientRects');assert.equal(spec.geometry.axisAlignedTransforms,'supported');assert.equal(spec.geometry.nonAxisAlignedTransforms,'indeterminate');assert.match(spec.geometry.partialViewport,/visible-intersection/);});
test('only confirmed violations become findings',async()=>{const{spec}=await load();assert.deepEqual(spec.findingConversion,{status:'confirmed',outcome:'violation',onePer:'target-viewport-colorScheme'});assert.ok(spec.outcomes.includes('spacing-exception'));assert.ok(spec.statuses.includes('failed'));});
test('evidence and indeterminate taxonomy are present',async()=>{const{spec}=await load();for(const f of ['selector','targetType','width','height','centerX','centerY','viewport','browserVersion'])assert.ok(spec.evidence.includes(f));for(const r of ['non-axis-aligned-transform','ambiguous-fragmentation','ambiguous-overlap','unsupported-hit-area'])assert.ok(spec.indeterminateReasons.includes(r));});
test('candidate matrix aligns and is ready',async()=>{const{spec,matrix}=await load();const c=matrix.candidates.find(x=>x.proposalId===spec.proposalId);assert.ok(c);assert.equal(c.proposedRuleId,spec.ruleId);assert.equal(c.disposition,'accept-for-browser-assisted-implementation');assert.equal(c.implementationReadiness,'ready-for-implementation');assert.deepEqual(c.profileRecommendations,spec.profiles);});
test('decision PR leaves 18 production rules and F020 present',async()=>{const{spec,catalog}=await load();assert.equal(catalog.rules.length,18);assert.ok(catalog.rules.some(r=>r.id===spec.ruleId));});
