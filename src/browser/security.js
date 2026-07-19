/**
 * browser/security.js
 *
 * Security policy for browser-assisted analysis.
 * Treats every local HTML document as untrusted executable content.
 */

/**
 * @typedef {object} SecurityPolicy
 * @property {string[]} blockedDomains - domain patterns to block
 * @property {boolean} blockExternalHttp - block external HTTP/HTTPS requests
 * @property {boolean} blockWebSockets - block WebSocket connections
 * @property {boolean} blockPopups - block popup windows
 * @property {boolean} blockDownloads - block file downloads
 * @property {boolean} blockServiceWorkers - block service worker registration
 * @property {boolean} denyPermissions - deny all permission requests
 * @property {boolean} dismissDialogs - auto-dismiss alert/confirm/prompt dialogs
 * @property {boolean} blockExternalNavigation - block navigation to external URLs
 * @property {string[]} allowedOrigins - origins allowed for asset loading (local scan root)
 */

/**
 * Create the default security policy for browser-assisted analysis.
 *
 * @param {object} [options]
 * @param {string} [options.scanRoot] - normalized scan root for local asset access
 * @returns {SecurityPolicy}
 */
export function createSecurityPolicy(options = {}) {
  const { scanRoot = 'file://' } = options;
  const fileOrigin = scanRoot.startsWith('file://')
    ? scanRoot
    : `file://${scanRoot.replace(/\\/g, '/')}`;

  return {
    blockedDomains: ['*'],
    blockExternalHttp: true,
    blockWebSockets: true,
    blockPopups: true,
    blockDownloads: true,
    blockServiceWorkers: true,
    denyPermissions: true,
    dismissDialogs: true,
    blockExternalNavigation: true,
    allowedOrigins: [fileOrigin]
  };
}

/**
 * Route decision for a resource request.
 *
 * @typedef {'block'|'allow'|'abort'} RouteAction
 */

/**
 * Determine the action for a given request URL based on the security policy.
 *
 * @param {string} requestUrl - the URL being requested
 * @param {SecurityPolicy} policy
 * @returns {RouteAction}
 */
export function routeRequest(requestUrl, policy) {
  try {
    const url = new URL(requestUrl);

    // Always allow file:// requests within the scan root
    if (url.protocol === 'file:') {
      const isAllowed = policy.allowedOrigins.some((origin) =>
        requestUrl.startsWith(origin)
      );
      if (!isAllowed) return 'abort';
      return 'allow';
    }

    // Block WebSocket connections
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
      return 'abort';
    }

    // Block external HTTP/HTTPS when policy says so
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (policy.blockExternalHttp) return 'abort';
      return 'allow';
    }

    // Block everything else
    return 'abort';
  } catch {
    // Invalid URLs are blocked
    return 'abort';
  }
}

/**
 * Check if a navigation target URL is allowed.
 *
 * @param {string} targetUrl
 * @param {SecurityPolicy} policy
 * @returns {boolean}
 */
export function isNavigationAllowed(targetUrl, policy) {
  if (!policy.blockExternalNavigation) return true;

  // Bare fragments (e.g., "#main-content") are same-document navigations
  if (targetUrl.startsWith('#')) return true;

  try {
    const url = new URL(targetUrl);
    // Same-document anchors are always allowed
    if (url.protocol === 'file:' || (url.hash && url.origin === 'null')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if a file path is within the scan root (no path traversal).
 *
 * @param {string} resolvedPath - absolute resolved file path
 * @param {string} scanRoot - absolute scan root path
 * @returns {boolean}
 */
export function isWithinScanRoot(resolvedPath, scanRoot) {
  const normalizedPath = resolvedPath.replace(/\\/g, '/');
  const normalizedRoot = scanRoot.replace(/\\/g, '/');
  return normalizedPath.startsWith(normalizedRoot);
}

/**
 * Check if a path attempts directory traversal outside the scan root.
 *
 * @param {string} relativePath - relative path from the HTML file
 * @returns {boolean}
 */
export function hasPathTraversal(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  return normalized.split('/').includes('..');
}
