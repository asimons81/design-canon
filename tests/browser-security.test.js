import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSecurityPolicy,
  routeRequest,
  isNavigationAllowed,
  isWithinScanRoot,
  hasPathTraversal
} from '../src/browser/security.js';

test('external HTTP request is blocked', () => {
  const policy = createSecurityPolicy();
  const action = routeRequest('https://example.com/tracker.js', policy);
  assert.equal(action, 'abort');
});

test('external HTTPS request is blocked', () => {
  const policy = createSecurityPolicy();
  const action = routeRequest('https://analytics.google.com/collect', policy);
  assert.equal(action, 'abort');
});

test('WebSocket connection is blocked', () => {
  const policy = createSecurityPolicy();
  const action = routeRequest('wss://example.com/socket', policy);
  assert.equal(action, 'abort');
});

test('local file within scan root is allowed', () => {
  const policy = createSecurityPolicy({ scanRoot: 'file:///home/user/project' });
  const action = routeRequest('file:///home/user/project/style.css', policy);
  assert.equal(action, 'allow');
});

test('file outside scan root is aborted', () => {
  const policy = createSecurityPolicy({ scanRoot: 'file:///home/user/project' });
  const action = routeRequest('file:///home/user/other/secret.txt', policy);
  assert.equal(action, 'abort');
});

test('popup is blocked by default', () => {
  const policy = createSecurityPolicy();
  assert.equal(policy.blockPopups, true);
});

test('downloads are blocked by default', () => {
  const policy = createSecurityPolicy();
  assert.equal(policy.blockDownloads, true);
});

test('permissions are denied by default', () => {
  const policy = createSecurityPolicy();
  assert.equal(policy.denyPermissions, true);
});

test('dialogs are dismissed by default', () => {
  const policy = createSecurityPolicy();
  assert.equal(policy.dismissDialogs, true);
});

test('external navigation is blocked by default', () => {
  const policy = createSecurityPolicy();
  assert.equal(policy.blockExternalNavigation, true);
});

test('service workers are blocked by default', () => {
  const policy = createSecurityPolicy();
  assert.equal(policy.blockServiceWorkers, true);
});

test('external WebSocket protocol is blocked', () => {
  const policy = createSecurityPolicy();
  assert.equal(routeRequest('ws://localhost:8080', policy), 'abort');
});

test('isNavigationAllowed blocks external URLs', () => {
  const policy = createSecurityPolicy();
  assert.equal(isNavigationAllowed('https://evil.com/phish', policy), false);
});

test('isNavigationAllowed allows file URLs', () => {
  const policy = createSecurityPolicy();
  assert.equal(isNavigationAllowed('file:///home/user/page.html', policy), true);
});

test('isNavigationAllowed allows same-document anchors', () => {
  const policy = createSecurityPolicy();
  assert.equal(isNavigationAllowed('#main-content', policy), true);
});

test('isWithinScanRoot rejects paths outside root', () => {
  assert.equal(isWithinScanRoot('/home/user/other/secret.txt', '/home/user/project'), false);
});

test('isWithinScanRoot accepts paths inside root', () => {
  assert.equal(isWithinScanRoot('/home/user/project/subdir/style.css', '/home/user/project'), true);
});

test('hasPathTraversal detects directory escape', () => {
  assert.equal(hasPathTraversal('../outside.css'), true);
  assert.equal(hasPathTraversal('subdir/../../outside.css'), true);
});

test('hasPathTraversal accepts safe paths', () => {
  assert.equal(hasPathTraversal('style.css'), false);
  assert.equal(hasPathTraversal('subdir/style.css'), false);
});

test('remote fonts are blocked', () => {
  const policy = createSecurityPolicy();
  assert.equal(routeRequest('https://fonts.googleapis.com/css2', policy), 'abort');
});

test('remote images are blocked', () => {
  const policy = createSecurityPolicy();
  assert.equal(routeRequest('https://cdn.example.com/image.png', policy), 'abort');
});

test('fetch API calls are blocked', () => {
  const policy = createSecurityPolicy();
  assert.equal(routeRequest('https://api.example.com/data', policy), 'abort');
});
