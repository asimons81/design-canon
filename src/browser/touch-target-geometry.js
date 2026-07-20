/**
 * browser/touch-target-geometry.js
 *
 * Pure, dependency-free geometry utilities for F020 touch-target analysis.
 *
 * All functions use full floating-point precision. No rounding is applied
 * before pass/fail comparison. The WCAG 2.5.8 baseline is 24 × 24 CSS pixels.
 *
 * This module is separately testable and contains no browser, DOM, or
 * framework dependencies.
 */

// ── Constants ─────────────────────────────────────────────────────────

/** WCAG 2.5.8 minimum target size (CSS pixels). */
export const MIN_TARGET_WIDTH = 24;
export const MIN_TARGET_HEIGHT = 24;

/** Spacing-circle radius (CSS pixels). */
export const SPACING_RADIUS = 12;

/** Circle-to-circle tangency threshold (2 × radius). */
export const CIRCLE_TANGENCY = 24;

// ── Rectangle ─────────────────────────────────────────────────────────

/**
 * Normalize a rectangle from any two corner representation.
 * Ensures x, y are the top-left and width, height are non-negative.
 *
 * @param {{x:number, y:number, width:number, height:number}} rect
 * @returns {{x:number, y:number, width:number, height:number}}
 */
export function normalizeRect(rect) {
  let { x, y, width, height } = rect;
  if (width < 0) { x += width; width = -width; }
  if (height < 0) { y += height; height = -height; }
  return { x, y, width, height };
}

/**
 * Compute the intersection of two axis-aligned rectangles.
 * Returns null when they do not intersect.
 *
 * @param {{x:number, y:number, width:number, height:number}} a
 * @param {{x:number, y:number, width:number, height:number}} b
 * @returns {{x:number, y:number, width:number, height:number}|null}
 */
export function rectIntersection(a, b) {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const ix = Math.max(a.x, b.x);
  const iy = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  if (ix >= ix2 || iy >= iy2) return null;
  return { x: ix, y: iy, width: ix2 - ix, height: iy2 - iy };
}

/**
 * Compute the viewport intersection of a target rectangle.
 * Returns null when the target is wholly off-viewport.
 *
 * @param {{x:number, y:number, width:number, height:number}} targetRect
 * @param {{width:number, height:number}} viewport
 * @returns {{x:number, y:number, width:number, height:number}|null}
 */
export function viewportIntersection(targetRect, viewport) {
  return rectIntersection(
    targetRect,
    { x: 0, y: 0, width: viewport.width, height: viewport.height }
  );
}

// ── Center ────────────────────────────────────────────────────────────

/**
 * Compute the center point of a rectangle.
 *
 * @param {{x:number, y:number, width:number, height:number}} rect
 * @returns {{x:number, y:number}}
 */
export function rectCenter(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

/**
 * Compute Euclidean distance between two points.
 *
 * @param {{x:number, y:number}} a
 * @param {{x:number, y:number}} b
 * @returns {number}
 */
export function euclideanDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Point-to-rectangle distance ───────────────────────────────────────

/**
 * Compute the minimum Euclidean distance from a point to an axis-aligned rectangle.
 * Returns 0 when the point is inside the rectangle.
 *
 * @param {{x:number, y:number}} point
 * @param {{x:number, y:number, width:number, height:number}} rect
 * @returns {number}
 */
export function pointToRectDistance(point, rect) {
  const cx = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
  const cy = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
  return euclideanDistance(point, { x: cx, y: cy });
}

// ── Circle intersections ──────────────────────────────────────────────

/**
 * Check if two circles intersect.
 * Uses strict less-than: exact tangency at distance === 24 does NOT intersect.
 *
 * @param {{x:number, y:number}} centerA
 * @param {{x:number, y:number}} centerB
 * @returns {boolean}
 */
export function circlesIntersect(centerA, centerB) {
  return euclideanDistance(centerA, centerB) < CIRCLE_TANGENCY;
}

/**
 * Check if a circle intersects a rectangle.
 * Uses strict less-than: exact tangency at distance === 12 does NOT intersect.
 *
 * The circle is defined by its center and radius.
 *
 * @param {{x:number, y:number}} center - circle center
 * @param {number} radius - circle radius
 * @param {{x:number, y:number, width:number, height:number}} rect
 * @returns {boolean}
 */
export function circleIntersectsRect(center, radius, rect) {
  return pointToRectDistance(center, rect) < radius;
}

// ── Size classification ───────────────────────────────────────────────

/**
 * Check if a rectangle meets the minimum size requirement.
 * Both dimensions must be >= 24. Uses full floating-point precision.
 *
 * @param {{width:number, height:number}} size
 * @returns {boolean}
 */
export function meetsMinimumSize(size) {
  return size.width >= MIN_TARGET_WIDTH && size.height >= MIN_TARGET_HEIGHT;
}

/**
 * Classify a target as passing, undersized, or (for future use) marginal.
 *
 * @param {number} width
 * @param {number} height
 * @returns {'pass'|'undersized-width'|'undersized-height'|'undersized-both'}
 */
export function classifySize(width, height) {
  const wOk = width >= MIN_TARGET_WIDTH;
  const hOk = height >= MIN_TARGET_HEIGHT;
  if (wOk && hOk) return 'pass';
  if (!wOk && !hOk) return 'undersized-both';
  if (!wOk) return 'undersized-width';
  return 'undersized-height';
}

// ── Transform classification ──────────────────────────────────────────

/**
 * Classify a CSS transform string as supported or indeterminate.
 *
 * Supported: identity, axis-aligned translation, axis-aligned scale.
 * Indeterminate: rotation, skew, perspective, non-axis-aligned matrices.
 * Returns null when no transform is present (identity matrix).
 *
 * @param {string|null} transform - CSS transform computed value
 * @returns {'supported'|'indeterminate'|null}
 */
export function classifyTransform(transform) {
  if (!transform || transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)') {
    return null;
  }

  const t = transform.trim();

  // Rotation: rotate(), rotateX(), rotateY(), rotateZ(), rotate3d()
  if (/\brotate(?:[XYZ]|3d)?\s*\(/.test(t)) return 'indeterminate';

  // Skew: skew(), skewX(), skewY()
  if (/\bskew[XY]?\s*\(/.test(t)) return 'indeterminate';

  // Perspective
  if (/\bperspective\s*\(/.test(t)) return 'indeterminate';

  // Check for a single matrix() or matrix3d()
  const matrix2d = t.match(/^matrix\(([^)]+)\)$/);
  if (matrix2d) {
    const parts = matrix2d[1].split(',').map(Number);
    // matrix(a, b, c, d, tx, ty)
    // Supported: b === 0 && c === 0 (axis-aligned scale + translation)
    const [a, b, c, d] = parts;
    if (b === 0 && c === 0) return 'supported';
    return 'indeterminate';
  }

  const matrix3d = t.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3d) {
    const parts = matrix3d[1].split(',').map(Number);
    // matrix3d: 16 values. Supported only when pure axis-aligned scale + translate.
    // Check that off-diagonal elements in the upper-left 3×3 are 0.
    if (parts.length >= 16) {
      const [,,, , ,,,, ,,,, ,,,, ,,] = parts;
      const b = parts[1], c = parts[2], e = parts[4], g = parts[6], h = parts[8], i = parts[9];
      if (b === 0 && c === 0 && e === 0 && g === 0 && h === 0 && i === 0) {
        return 'supported';
      }
    }
    return 'indeterminate';
  }

  // Multiple transform functions — check each
  const functions = t.match(/[a-z]+\([^)]+\)/gi) || [];
  for (const fn of functions) {
    if (/\brotate|skew|perspective\b/i.test(fn)) return 'indeterminate';
  }

  return 'supported';
}

// ── Spatial bucketing ─────────────────────────────────────────────────

/**
 * Simple spatial grid index for bounded-neighborhood queries.
 * Divides the viewport into uniform cells and assigns targets to buckets.
 *
 * This replaces an unbounded all-pairs scan with a bounded local search,
 * achieving O(n) indexing and O(n) query for typical target densities.
 *
 * @param {number} cellSize - grid cell size in CSS pixels (default 48 = 2× spacing radius)
 */
export class SpatialIndex {
  /**
   * @param {number} [cellSize=48]
   */
  constructor(cellSize = 48) {
    this.cellSize = cellSize;
    /** @type {Map<string, Array<{id:string, rect:{x:number,y:number,width:number,height:number}}>>} */
    this.cells = new Map();
  }

  /**
   * Insert a target into the spatial index.
   *
   * @param {string} id - target identifier
   * @param {{x:number, y:number, width:number, height:number}} rect
   */
  insert(id, rect) {
    const cellKeys = this._cellKeysForRect(rect);
    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key).push({ id, rect });
    }
  }

  /**
   * Find neighbor targets within a given search radius of a point.
   * Returns an array of {id, rect} for targets whose bounding rect
   * is within the search radius of the point.
   *
   * @param {{x:number, y:number}} point
   * @param {number} searchRadius - CSS pixels
   * @param {string} [excludeId] - exclude this target from results
   * @returns {Array<{id:string, rect:{x:number,y:number,width:number,height:number}}>}
   */
  findNeighbors(point, searchRadius, excludeId) {
    const seen = new Set();
    const results = [];

    // Determine which cells to check
    const minCol = Math.floor((point.x - searchRadius) / this.cellSize);
    const maxCol = Math.floor((point.x + searchRadius) / this.cellSize);
    const minRow = Math.floor((point.y - searchRadius) / this.cellSize);
    const maxRow = Math.floor((point.y + searchRadius) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col}:${row}`;
        const cell = this.cells.get(key);
        if (!cell) continue;
        for (const entry of cell) {
          if (excludeId && entry.id === excludeId) continue;
          if (seen.has(entry.id)) continue;
          seen.add(entry.id);
          // Only include if the rect is within searchRadius of the point
          const dx = Math.max(entry.rect.x - point.x, 0, point.x - (entry.rect.x + entry.rect.width));
          const dy = Math.max(entry.rect.y - point.y, 0, point.y - (entry.rect.y + entry.rect.height));
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < searchRadius) {
            results.push(entry);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get all targets in the index.
   */
  getAll() {
    const seen = new Set();
    const results = [];
    for (const cell of this.cells.values()) {
      for (const entry of cell) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        results.push(entry);
      }
    }
    return results;
  }

  /** @private */
  _cellKeysForRect(rect) {
    const keys = new Set();
    const minCol = Math.floor(rect.x / this.cellSize);
    const maxCol = Math.floor((rect.x + rect.width) / this.cellSize);
    const minRow = Math.floor(rect.y / this.cellSize);
    const maxRow = Math.floor((rect.y + rect.height) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        keys.add(`${col}:${row}`);
      }
    }
    return [...keys];
  }
}

// ── Evidence formatting ────────────────────────────────────────────────

/**
 * Format a deterministic evidence string for a touch-target finding.
 *
 * @param {object} sample
 * @param {string} viewport
 * @param {string} colorScheme
 * @param {string} browserVersion
 * @returns {string}
 */
export function formatEvidence(sample, viewport, colorScheme, browserVersion) {
  const vp = typeof viewport === 'string' ? viewport : (viewport?.name || 'desktop');
  const scheme = colorScheme || 'light';
  const ver = browserVersion || 'unknown';
  const parts = [
    `selector="${sample.selector}"`,
    `target=${sample.targetType}`,
    `label="${sample.label || ''}"`,
    `size=${sample.width?.toFixed(3)}x${sample.height?.toFixed(3)}`,
    `required=${MIN_TARGET_WIDTH}x${MIN_TARGET_HEIGHT}`
  ];

  if (sample.spacingProof) {
    parts.push(`spacing=${sample.spacingProof.passed ? 'passed' : 'failed'}`);
    if (sample.spacingProof.nearest) {
      parts.push(`nearest="${sample.spacingProof.nearest}"`);
    }
    if (sample.spacingProof.centerDistance !== undefined) {
      parts.push(`centerDistance=${sample.spacingProof.centerDistance.toFixed(3)}`);
    }
  }

  parts.push(`viewport=${vp}(${sample.viewportWidth || ''}x${sample.viewportHeight || ''})`);
  parts.push(`scheme=${scheme}`);
  parts.push(`chromium=${ver}`);

  return parts.join('; ');
}