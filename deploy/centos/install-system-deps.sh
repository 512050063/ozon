#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "请使用 root 执行: sudo bash deploy/centos/install-system-deps.sh" >&2
  exit 1
fi

if command -v dnf >/dev/null 2>&1; then
  PKG=dnf
else
  PKG=yum
fi

${PKG} install -y epel-release || true
${PKG} install -y \
  curl \
  wget \
  git \
  nginx \
  xz \
  python3 \
  python3-pip \
  mysql \
  nss \
  atk \
  at-spi2-atk \
  cups-libs \
  libdrm \
  libxkbcommon \
  libXcomposite \
  libXdamage \
  libXfixes \
  libXrandr \
  mesa-libgbm \
  pango \
  alsa-lib \
  fontconfig

install_node_glibc217() {
  local node_version="${NODE_VERSION:-20.20.2}"
  local node_dir="/usr/local/node-v${node_version}-linux-x64-glibc-217"
  local archive="/tmp/node-v${node_version}-linux-x64-glibc-217.tar.xz"
  local url="https://unofficial-builds.nodejs.org/download/release/v${node_version}/node-v${node_version}-linux-x64-glibc-217.tar.xz"

  if [ ! -x "${node_dir}/bin/node" ]; then
    echo "Installing Node.js ${node_version} for glibc 2.17 from unofficial builds..."
    curl -fL --retry 3 --connect-timeout 10 -o "$archive" "$url"
    rm -rf "$node_dir"
    tar -xJf "$archive" -C /usr/local
    rm -f "$archive"
  fi

  ln -sf "${node_dir}/bin/node" /usr/local/bin/node
  ln -sf "${node_dir}/bin/npm" /usr/local/bin/npm
  ln -sf "${node_dir}/bin/npx" /usr/local/bin/npx
}

GLIBC_VERSION="$(ldd --version 2>&1 | head -n 1 | grep -oE '[0-9]+\.[0-9]+' | tail -n 1 || echo 0)"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(`.`)[0]' 2>/dev/null || echo 0)" -lt 20 ]]; then
  if python - "$GLIBC_VERSION" <<'PY'
import sys
from distutils.version import LooseVersion
sys.exit(0 if LooseVersion(sys.argv[1]) < LooseVersion("2.28") else 1)
PY
  then
    install_node_glibc217
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    ${PKG} install -y nodejs
  fi
fi

python3 -m pip install --upgrade pip
python3 -m pip install --upgrade playwright
python3 -m playwright install chromium || true

if ! command -v google-chrome >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  cat >/etc/yum.repos.d/google-chrome.repo <<'EOF'
[google-chrome]
name=google-chrome
baseurl=https://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
  ${PKG} install -y google-chrome-stable || true
fi

systemctl enable nginx

echo "系统依赖安装完成。请继续配置 MySQL、上传应用包，并打开 /install。"
