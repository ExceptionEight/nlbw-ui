#!/bin/sh

# NLBW-UI Installer for OpenWRT

set -e

REPO="ExceptionEight/nlbw-ui"
BIN_PATH="/usr/bin/nlbwui"
CONFIG_DIR="/etc/nlbwui"
CONFIG_FILE="$CONFIG_DIR/config.yaml"
INIT_SCRIPT="/etc/init.d/nlbwui"
SYSUPGRADE_CONF="/etc/sysupgrade.conf"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { printf "${GREEN}[*]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[!]${NC} %s\n" "$1"; }
error() {
  printf "${RED}[✗]${NC} %s\n" "$1"
  exit 1
}
success() { printf "${GREEN}[✓]${NC} %s\n" "$1"; }

# Check if running on OpenWRT
check_openwrt() {
  if [ ! -f /etc/openwrt_release ]; then
    error "This script is designed for OpenWRT only"
  fi
}

# Detect architecture and map to release asset name
get_arch() {
  local arch=$(uname -m)
  case "$arch" in
  aarch64 | arm64)
    echo "linux-arm64"
    ;;
  x86_64 | amd64)
    echo "linux-amd64"
    ;;
  *)
    error "Unsupported architecture: $arch. Only aarch64 and x86_64 are supported."
    ;;
  esac
}

# Get nlbwmon database directory from UCI
get_nlbwmon_dir() {
  local dir=$(uci -q get nlbwmon.@nlbwmon[0].database_directory 2>/dev/null)
  if [ -z "$dir" ]; then
    dir="/var/lib/nlbwmon"
  fi
  echo "$dir"
}

# Stop service if running
stop_service() {
  if [ -f "$INIT_SCRIPT" ]; then
    "$INIT_SCRIPT" stop 2>/dev/null || true
  fi
}

# Download latest release binary
download_binary() {
  local arch="$1"
  local asset_name="nlbw-ui-${arch}"
  local download_url="https://github.com/${REPO}/releases/latest/download/${asset_name}"

  info "Downloading nlbw-ui for ${arch}..."

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$download_url" -o "$BIN_PATH" || error "Failed to download binary"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$BIN_PATH" "$download_url" || error "Failed to download binary"
  else
    error "Neither curl nor wget found. Please install one of them."
  fi

  chmod +x "$BIN_PATH"
  success "Binary installed to $BIN_PATH"
}

# Create config file
create_config() {
  local data_dir=$(get_nlbwmon_dir)

  if [ -f "$CONFIG_FILE" ]; then
    warn "Config already exists at $CONFIG_FILE, skipping..."
    return
  fi

  mkdir -p "$CONFIG_DIR"

  cat >"$CONFIG_FILE" <<EOF
# NLBW-UI Configuration
# Documentation: https://github.com/${REPO}

# Directory containing nlbwmon *.db.gz files
data_dir: ${data_dir}

# Scan interval for detecting new or modified files
scan_interval: 60m

# Web server settings
server_address: 0.0.0.0
server_port: 8080

# Friendly names for devices (MAC address -> human-readable name)
# friendly_names:
#   "11:22:33:44:55:66": "iPhone"
#   "AA:BB:CC:DD:EE:FF": "MacBook"
EOF

  success "Config created at $CONFIG_FILE (data_dir: $data_dir)"
}

# Create init.d service
create_init_script() {
  if [ -f "$INIT_SCRIPT" ]; then
    warn "Init script already exists, updating..."
  fi

  cat >"$INIT_SCRIPT" <<'EOF'
#!/bin/sh /etc/rc.common

START=99
STOP=10

USE_PROCD=1

start_service() {
    procd_open_instance
    procd_set_param command /usr/bin/nlbwui -c /etc/nlbwui/config.yaml
    procd_set_param respawn
    procd_set_param stdout 1
    procd_set_param stderr 1
    procd_close_instance
}
EOF

  chmod +x "$INIT_SCRIPT"
  success "Init script created at $INIT_SCRIPT"
}

# Add config to sysupgrade.conf
setup_sysupgrade() {
  if grep -q "^${CONFIG_DIR}$" "$SYSUPGRADE_CONF" 2>/dev/null; then
    info "Config directory already in sysupgrade.conf"
    return
  fi

  echo "$CONFIG_DIR" >>"$SYSUPGRADE_CONF"
  success "Added $CONFIG_DIR to sysupgrade.conf"
}

# Enable and start service
enable_service() {
  info "Enabling and starting nlbwui service..."
  "$INIT_SCRIPT" enable 2>/dev/null || true
  "$INIT_SCRIPT" start 2>/dev/null || true
  success "Service enabled and started"
}

# Uninstall
uninstall() {
  info "Uninstalling nlbw-ui..."

  # Stop and disable service
  if [ -f "$INIT_SCRIPT" ]; then
    "$INIT_SCRIPT" stop 2>/dev/null || true
    "$INIT_SCRIPT" disable 2>/dev/null || true
    rm -f "$INIT_SCRIPT"
    success "Removed init script"
  fi

  # Remove binary
  if [ -f "$BIN_PATH" ]; then
    rm -f "$BIN_PATH"
    success "Removed binary"
  fi

  # Remove config directory
  if [ -d "$CONFIG_DIR" ]; then
    rm -rf "$CONFIG_DIR"
    success "Removed config directory"
  fi

  # Remove from sysupgrade.conf
  if [ -f "$SYSUPGRADE_CONF" ]; then
    sed -i "\|^${CONFIG_DIR}$|d" "$SYSUPGRADE_CONF"
    success "Removed from sysupgrade.conf"
  fi

  success "nlbw-ui has been uninstalled"
}

# Main
main() {
  echo ""
  echo "======================================"
  echo "  NLBW-UI Installer for OpenWRT"
  echo "======================================"
  echo ""

  # Handle uninstall
  if [ "$1" = "--uninstall" ] || [ "$1" = "-u" ]; then
    check_openwrt
    uninstall
    exit 0
  fi

  check_openwrt

  local arch=$(get_arch)
  info "Detected architecture: $arch"

  # Stop service before updating binary
  stop_service

  download_binary "$arch"
  create_config
  create_init_script
  setup_sysupgrade
  enable_service

  echo ""
  success "Installation complete!"
  echo ""
  echo "  Web UI: http://$(uci -q get network.lan.ipaddr || echo "router-ip"):8080"
  echo "  Config: $CONFIG_FILE"
  echo ""
  echo "  Commands:"
  echo "    $INIT_SCRIPT start|stop|restart|status"
  echo ""
}

main "$@"
