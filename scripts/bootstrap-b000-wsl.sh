#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="24.13.0"
NODE_ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.xz"
NODE_SHA256="e798599612f4bb71333a3397ab0d095fd62214e115aea45aa858a145fc72d67e"
CODEX_VERSION="0.144.4"
PLAYWRIGHT_VERSION="1.61.1"
CHROMIUM_REVISION="1228"
CHROMIUM_VERSION="149.0.7827.55"
CHROMIUM_SHA256="670ba079b75107746ba41abad131180a31a7c7219aa1bd4061fb471f4535d541"
REPOSITORY_URL="https://github.com/asimons81/design-canon.git"
BRANCH="implementation/b000-codex-sol-runner"
HANDOFF_HEAD="9dcb12d831d0583f6f5e6ce974525be0b22c95e9"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "bootstrap-b000-wsl: run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  acl build-essential ca-certificates curl dnsutils git iproute2 iputils-ping jq \
  netcat-openbsd psmisc procps python3 rsync sudo strace xz-utils

install -d -m 0755 /opt/dcbench
node_root="/opt/dcbench/node-v${NODE_VERSION}"
if [[ ! -x "${node_root}/bin/node" ]]; then
  archive="/tmp/${NODE_ARCHIVE}"
  curl --fail --silent --show-error --location \
    "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}" -o "${archive}"
  printf '%s  %s\n' "${NODE_SHA256}" "${archive}" | sha256sum --check --status
  rm -rf "${node_root}"
  tar -xJf "${archive}" -C /opt/dcbench
  mv "/opt/dcbench/node-v${NODE_VERSION}-linux-x64" "${node_root}"
  rm -f "${archive}"
fi

for executable in node npm npx corepack; do
  ln -sfn "${node_root}/bin/${executable}" "/usr/local/bin/${executable}"
done
"${node_root}/bin/npm" install --global --prefix "${node_root}" "@openai/codex@${CODEX_VERSION}"
ln -sfn "${node_root}/bin/codex" /usr/local/bin/codex

playwright_root="/opt/dcbench/playwright-${PLAYWRIGHT_VERSION}"
install -d -m 0755 "${playwright_root}"
printf '{"private":true,"dependencies":{"playwright":"%s"}}\n' "${PLAYWRIGHT_VERSION}" > "${playwright_root}/package.json"
"${node_root}/bin/npm" install --prefix "${playwright_root}" --save-exact --package-lock=true
PLAYWRIGHT_BROWSERS_PATH=/opt/dcbench/ms-playwright \
  "${node_root}/bin/npx" --prefix "${playwright_root}" playwright install --with-deps chromium
chmod -R a+rX /opt/dcbench/ms-playwright "${playwright_root}"
browser_executable="/opt/dcbench/ms-playwright/chromium_headless_shell-${CHROMIUM_REVISION}/chrome-headless-shell-linux64/chrome-headless-shell"
if [[ ! -f "${browser_executable}" || ! -r "${browser_executable}" || ! -x "${browser_executable}" ]]; then
  echo "bootstrap-b000-wsl: pinned Chromium executable is unavailable" >&2
  exit 1
fi
browser_real_path="$(realpath "${browser_executable}")"
case "${browser_real_path}" in
  /opt/dcbench/ms-playwright/*) ;;
  *) echo "bootstrap-b000-wsl: Chromium escaped the pinned root" >&2; exit 1 ;;
esac
browser_reported_version="$("${browser_real_path}" --version | awk '{print $NF}')"
if [[ "${browser_reported_version}" != "${CHROMIUM_VERSION}" ]]; then
  echo "bootstrap-b000-wsl: Chromium version mismatch" >&2
  exit 1
fi
browser_sha256="$(sha256sum "${browser_real_path}" | awk '{print $1}')"
if [[ "${browser_sha256}" != "${CHROMIUM_SHA256}" ]]; then
  echo "bootstrap-b000-wsl: Chromium SHA-256 mismatch" >&2
  exit 1
fi

getent group dcbench-collect >/dev/null || groupadd --system dcbench-collect
for user in dcbench-runner dcbench-agent; do
  if ! id "${user}" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "${user}"
  fi
  usermod --append --groups dcbench-collect "${user}"
  chmod 0700 "/home/${user}"
done

install -d -o dcbench-agent -g dcbench-agent -m 0700 /home/dcbench-agent/.codex
install -d -o dcbench-agent -g dcbench-agent -m 0700 /home/dcbench-agent/tmp
install -d -o root -g root -m 0711 /var/lib/dcbench
install -d -o dcbench-runner -g dcbench-runner -m 0711 /var/lib/dcbench/workspaces
install -d -o dcbench-runner -g dcbench-runner -m 0700 /var/lib/dcbench/evidence

cat > /etc/sudoers.d/dcbench-runner-agent <<'EOF'
dcbench-runner ALL=(dcbench-agent) NOPASSWD: ALL
EOF
chmod 0440 /etc/sudoers.d/dcbench-runner-agent
visudo --check --file=/etc/sudoers.d/dcbench-runner-agent

repo="/home/dcbench-runner/src/design-canon"
install -d -o dcbench-runner -g dcbench-runner -m 0700 "$(dirname "${repo}")"
if [[ ! -d "${repo}/.git" ]]; then
  sudo -u dcbench-runner git clone --branch "${BRANCH}" --single-branch "${REPOSITORY_URL}" "${repo}"
else
  sudo -u dcbench-runner git -C "${repo}" fetch origin "${BRANCH}"
  sudo -u dcbench-runner git -C "${repo}" switch "${BRANCH}"
  sudo -u dcbench-runner git -C "${repo}" merge --ff-only "origin/${BRANCH}"
fi
chmod 0700 /home/dcbench-runner /home/dcbench-runner/src "${repo}"

actual_head="$(sudo -u dcbench-runner git -C "${repo}" rev-parse HEAD)"
if ! sudo -u dcbench-runner git -C "${repo}" merge-base --is-ancestor "${HANDOFF_HEAD}" HEAD; then
  echo "bootstrap-b000-wsl: handoff head ${HANDOFF_HEAD} is not an ancestor of ${actual_head}" >&2
  exit 1
fi

evidence="/var/lib/dcbench/evidence/bootstrap"
install -d -o dcbench-runner -g dcbench-runner -m 0700 "${evidence}"
{
  printf 'timestamp=%s\n' "$(date --iso-8601=seconds)"
  printf 'distribution=%s\n' "${WSL_DISTRO_NAME:-unknown}"
  printf 'repository=%s\n' "${repo}"
  printf 'head=%s\n' "${actual_head}"
  printf 'node_archive_sha256=%s\n' "${NODE_SHA256}"
  printf 'browser_executable=%s\n' "${browser_real_path}"
  printf 'browser_executable_sha256=%s\n' "${browser_sha256}"
  printf 'playwright_version=%s\n' "${PLAYWRIGHT_VERSION}"
  printf 'chromium_version=%s\n' "${browser_reported_version}"
} > "${evidence}/bootstrap-metadata.txt"
codex --version > "${evidence}/codex-version.txt"
codex --help > "${evidence}/codex-help.txt"
codex exec --help > "${evidence}/codex-exec-help.txt"
node --version > "${evidence}/node-version.txt"
npm --version > "${evidence}/npm-version.txt"
git --version > "${evidence}/git-version.txt"
uname -a > "${evidence}/uname.txt"
sha256sum "${evidence}"/*.txt > "${evidence}/SHA256SUMS"
chown -R dcbench-runner:dcbench-runner "${evidence}"
chmod -R u=rwX,go= "${evidence}"

printf 'bootstrap-b000-wsl: ready\n'
printf 'repository=%s\n' "${repo}"
printf 'head=%s\n' "${actual_head}"
printf 'node=%s\n' "$(node --version)"
printf 'npm=%s\n' "$(npm --version)"
printf 'codex=%s\n' "$(codex --version)"
printf 'playwright=%s\n' "$(node -p "require('${playwright_root}/node_modules/playwright/package.json').version")"
printf 'browser_executable=%s\n' "${browser_real_path}"
printf 'chromium=%s\n' "${browser_reported_version}"
