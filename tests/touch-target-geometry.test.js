/**
 * tests/touch-target-geometry.test.js
 *
 * Unit tests for pure geometry utilities used by F020 touch-target analysis.
 * No browser or DOM dependencies — these test pure math.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_TARGET_WIDTH,
  MIN_TARGET_HEIGHT,
  SPACING_RADIUS,
  CIRCLE_TANGENCY,
  normalizeRect,
  rectIntersection,
  viewportIntersection,
  rectCenter,
  euclideanDistance,
  pointToRectDistance,
  circlesIntersect,
  circleIntersectsRect,
  meetsMinimumSize,
  classifySize,
  classifyTransform,
  SpatialIndex,
  formatEvidence
} from '../src/browser/touch-target-geometry.js';

// ── Rectangle ─────────────────────────────────────────────────────────

test('normalizeRect handles negative width', () => {
  const r = normalizeRect({ x: 10, y: 10, width: -20, height: 30 });
  assert.equal(r.x, -10);
  assert.equal(r.width, 20);
});

test('normalizeRect handles negative height', () => {
  const r = normalizeRect({ x: 10, y: 10, width: 20, height: -30 });
  assert.equal(r.y, -20);
  assert.equal(r.height, 30);
});

test('rectIntersection returns intersection', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  const b = { x: 5, y: 5, width: 10, height: 10 };
  const r = rectIntersection(a, b);
  assert.ok(r);
  assert.equal(r.x, 5);
  assert.equal(r.y, 5);
  assert.equal(r.width, 5);
  assert.equal(r.height, 5);
});

test('rectIntersection returns null for non-overlapping', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  const b = { x: 20, y: 20, width: 10, height: 10 };
  assert.equal(rectIntersection(a, b), null);
});

test('viewportIntersection excludes wholly off-viewport', () => {
  const target = { x: -100, y: -100, width: 50, height: 50 };
  const vp = { width: 390, height: 844 };
  assert.equal(viewportIntersection(target, vp), null);
});

test('viewportIntersection clips partially visible', () => {
  const target = { x: -10, y: 0, width: 50, height: 50 };
  const vp = { width: 390, height: 844 };
  const r = viewportIntersection(target, vp);
  assert.ok(r);
  assert.equal(r.x, 0);
  assert.equal(r.width, 40);
});

// ── Center ────────────────────────────────────────────────────────────

test('rectCenter computes correct center', () => {
  const center = rectCenter({ x: 10, y: 20, width: 30, height: 40 });
  assert.equal(center.x, 25);
  assert.equal(center.y, 40);
});

// ── Distance ──────────────────────────────────────────────────────────

test('euclideanDistance computes correctly', () => {
  assert.equal(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('euclideanDistance zero for same point', () => {
  assert.equal(euclideanDistance({ x: 5, y: 5 }, { x: 5, y: 5 }), 0);
});

// ── Point-to-rectangle distance ───────────────────────────────────────

test('pointToRectDistance inside rectangle returns 0', () => {
  assert.equal(pointToRectDistance({ x: 5, y: 5 }, { x: 0, y: 0, width: 10, height: 10 }), 0);
});

test('pointToRectDistance outside returns correct distance', () => {
  const d = pointToRectDistance({ x: 15, y: 5 }, { x: 0, y: 0, width: 10, height: 10 });
  assert.equal(d, 5);
});

// ── Circle intersections ──────────────────────────────────────────────

test('circlesIntersect at exact tangency 24 does NOT intersect', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 24, y: 0 };
  assert.equal(circlesIntersect(a, b), false);
});

test('circlesIntersect below 24 DOES intersect', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 23.999, y: 0 };
  assert.equal(circlesIntersect(a, b), true);
});

test('circleIntersectsRect at exact tangency 12 does NOT intersect', () => {
  const center = { x: 0, y: 0 };
  const rect = { x: 12, y: 0, width: 10, height: 10 };
  assert.equal(circleIntersectsRect(center, 12, rect), false);
});

test('circleIntersectsRect below 12 DOES intersect', () => {
  const center = { x: 0, y: 0 };
  const rect = { x: 11.999, y: 0, width: 10, height: 10 };
  assert.equal(circleIntersectsRect(center, 12, rect), true);
});

// ── Size classification ───────────────────────────────────────────────

test('meetsMinimumSize exact 24 passes', () => {
  assert.equal(meetsMinimumSize({ width: 24, height: 24 }), true);
});

test('meetsMinimumSize larger passes', () => {
  assert.equal(meetsMinimumSize({ width: 48, height: 48 }), true);
});

test('meetsMinimumSize 23.999 fails', () => {
  assert.equal(meetsMinimumSize({ width: 23.999, height: 23.999 }), false);
});

test('meetsMinimumSize 24x20 fails', () => {
  assert.equal(meetsMinimumSize({ width: 24, height: 20 }), false);
});

test('meetsMinimumSize 20x24 fails', () => {
  assert.equal(meetsMinimumSize({ width: 20, height: 24 }), false);
});

test('classifySize returns pass for both ok', () => {
  assert.equal(classifySize(24, 24), 'pass');
});

test('classifySize returns undersized-width', () => {
  assert.equal(classifySize(20, 30), 'undersized-width');
});

test('classifySize returns undersized-height', () => {
  assert.equal(classifySize(30, 20), 'undersized-height');
});

test('classifySize returns undersized-both', () => {
  assert.equal(classifySize(20, 20), 'undersized-both');
});

// ── Transform classification ──────────────────────────────────────────

test('classifyTransform null for none', () => {
  assert.equal(classifyTransform('none'), null);
  assert.equal(classifyTransform(null), null);
  assert.equal(classifyTransform('matrix(1, 0, 0, 1, 0, 0)'), null);
});

test('classifyTransform axis-aligned translation is supported', () => {
  assert.equal(classifyTransform('matrix(1, 0, 0, 1, 10, 20)'), 'supported');
});

test('classifyTransform axis-aligned scale is supported', () => {
  assert.equal(classifyTransform('matrix(0.5, 0, 0, 0.5, 0, 0)'), 'supported');
});

test('classifyTransform rotation is indeterminate', () => {
  assert.equal(classifyTransform('rotate(45deg)'), 'indeterminate');
});

test('classifyTransform skew is indeterminate', () => {
  assert.equal(classifyTransform('skewX(10deg)'), 'indeterminate');
});

test('classifyTransform perspective is indeterminate', () => {
  assert.equal(classifyTransform('perspective(100px)'), 'indeterminate');
});

// ── SpatialIndex ──────────────────────────────────────────────────────

test('SpatialIndex insert and findNeighbors', () => {
  const idx = new SpatialIndex(48);
  idx.insert('a', { x: 0, y: 0, width: 20, height: 20 });
  idx.insert('b', { x: 10, y: 10, width: 20, height: 20 });
  idx.insert('c', { x: 200, y: 200, width: 20, height: 20 });

  const neighbors = idx.findNeighbors({ x: 10, y: 10 }, 30);
  const ids = neighbors.map(n => n.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
});

test('SpatialIndex excludes self', () => {
  const idx = new SpatialIndex(48);
  idx.insert('a', { x: 0, y: 0, width: 20, height: 20 });
  idx.insert('b', { x: 10, y: 10, width: 20, height: 20 });

  const neighbors = idx.findNeighbors({ x: 10, y: 10 }, 30, 'b');
  const ids = neighbors.map(n => n.id);
  assert.deepEqual(ids, ['a']);
});

test('SpatialIndex produces same results as reference brute-force', () => {
  const idx = new SpatialIndex(48);
  const targets = [];
  for (let i = 0; i < 50; i++) {
    const rect = { x: Math.random() * 500, y: Math.random() * 500, width: 20, height: 20 };
    idx.insert(String(i), rect);
    targets.push({ id: String(i), rect });
  }

  // Pick a random point and verify neighbors match brute force
  const point = { x: 250, y: 250 };
  const searchRadius = 50;

  // Brute force
  const bruteForce = targets.filter(t => {
    const dist = pointToRectDistance(point, t.rect);
    return dist < searchRadius;
  }).map(t => t.id).sort();

  // Spatial
  const spatial = idx.findNeighbors(point, searchRadius).map(n => n.id).sort();

  assert.deepEqual(spatial, bruteForce);
});

// ── Evidence formatting ───────────────────────────────────────────────

test('formatEvidence produces deterministic string', () => {
  const sample = {
    selector: '#menu',
    targetType: 'button',
    label: 'Menu',
    width: 20,
    height: 20,
    requiredWidth: 24,
    requiredHeight: 24,
    viewportWidth: 390,
    viewportHeight: 844
  };
  const evidence = formatEvidence(sample, 'mobile', 'light', '126.0.0.0');
  assert.ok(evidence.includes('selector="#menu"'));
  assert.ok(evidence.includes('target=button'));
  assert.ok(evidence.includes('label="Menu"'));
  assert.ok(evidence.includes('size=20.000x20.000'));
  assert.ok(evidence.includes('required=24x24'));
  assert.ok(evidence.includes('viewport=mobile(390x844)'));
  assert.ok(evidence.includes('scheme=light'));
  assert.ok(evidence.includes('chromium=126.0.0.0'));
});

// ── Coincident centers ────────────────────────────────────────────────

test('coincident centers fail spacing', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };
  assert.equal(circlesIntersect(a, b), true);
  assert.equal(euclideanDistance(a, b), 0);
});