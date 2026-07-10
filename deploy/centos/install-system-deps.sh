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
  alsa-lib

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(`.`)[0]')" -lt 20 ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  ${PKG} install -y nodejs
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
