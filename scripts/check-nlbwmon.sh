#!/bin/ash

# nlbwmon configuration checker for OpenWRT
# Safe for: wget -qO- URL | ash

main() {

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }

ask_fix() {
    printf "${YELLOW}Fix it? [y/N]: ${NC}"
    read -r answer
    [ "$answer" = "y" ] || [ "$answer" = "Y" ]
}

get_opt() {
    uci get nlbwmon.@nlbwmon[0]."$1" 2>/dev/null
}

ERRORS=0

echo "========================================="
echo "  nlbwmon Configuration Check"
echo "========================================="
echo ""

# 0. Check if nlbwmon is installed
echo "--- Installation Check ---"
if opkg list-installed | grep -q "^nlbwmon "; then
    ok "nlbwmon is installed"
else
    fail "nlbwmon is NOT installed"
    printf "${YELLOW}Install nlbwmon? [y/N]: ${NC}"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        opkg update && opkg install nlbwmon
        if [ $? -eq 0 ]; then
            ok "nlbwmon installed successfully"
        else
            fail "Failed to install nlbwmon"
            exit 1
        fi
    else
        exit 1
    fi
fi
echo ""

# 1. Check netlink_buffer_size >= 4194304
echo "--- netlink_buffer_size Check ---"
BUFFER_SIZE=$(get_opt netlink_buffer_size)
REQUIRED_BUFFER=4194304

if [ -z "$BUFFER_SIZE" ]; then
    fail "netlink_buffer_size is not set"
    BUFFER_SIZE=0
fi

if [ "$BUFFER_SIZE" -ge "$REQUIRED_BUFFER" ] 2>/dev/null; then
    ok "netlink_buffer_size = $BUFFER_SIZE (>= $REQUIRED_BUFFER)"
else
    fail "netlink_buffer_size = $BUFFER_SIZE (required >= $REQUIRED_BUFFER)"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        uci set nlbwmon.@nlbwmon[0].netlink_buffer_size="$REQUIRED_BUFFER"
        uci commit nlbwmon
        ok "Set netlink_buffer_size = $REQUIRED_BUFFER"
    fi
fi

# 2. Check system rmem_max matches buffer size
echo ""
echo "--- System rmem_max Check ---"
SYS_RMEM=$(cat /proc/sys/net/core/rmem_max 2>/dev/null)
BUFFER_SIZE=$(get_opt netlink_buffer_size)

if [ -n "$SYS_RMEM" ] && [ -n "$BUFFER_SIZE" ]; then
    if [ "$SYS_RMEM" -ge "$BUFFER_SIZE" ]; then
        ok "System rmem_max ($SYS_RMEM) >= netlink_buffer_size ($BUFFER_SIZE)"
    else
        fail "System rmem_max ($SYS_RMEM) < netlink_buffer_size ($BUFFER_SIZE)"
        warn "nlbwmon may lose packets!"
        ERRORS=$((ERRORS + 1))
        if ask_fix; then
            echo "$BUFFER_SIZE" > /proc/sys/net/core/rmem_max
            if ! grep -q "net.core.rmem_max" /etc/sysctl.conf 2>/dev/null; then
                echo "net.core.rmem_max=$BUFFER_SIZE" >> /etc/sysctl.conf
                ok "Added to /etc/sysctl.conf"
            else
                sed -i "s/net.core.rmem_max=.*/net.core.rmem_max=$BUFFER_SIZE/" /etc/sysctl.conf
                ok "Updated /etc/sysctl.conf"
            fi
            ok "Set rmem_max = $BUFFER_SIZE"
        fi
    fi
else
    warn "Could not check system rmem_max"
fi

# 3. Check commit_interval
echo ""
echo "--- commit_interval Check ---"
COMMIT_INT=$(get_opt commit_interval)
REQUIRED_COMMIT="1h"

if [ "$COMMIT_INT" = "$REQUIRED_COMMIT" ]; then
    ok "commit_interval = $COMMIT_INT"
else
    fail "commit_interval = '$COMMIT_INT' (required '$REQUIRED_COMMIT')"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        uci set nlbwmon.@nlbwmon[0].commit_interval="$REQUIRED_COMMIT"
        uci commit nlbwmon
        ok "Set commit_interval = $REQUIRED_COMMIT"
    fi
fi

# 4. Check refresh_interval
echo ""
echo "--- refresh_interval Check ---"
REFRESH_INT=$(get_opt refresh_interval)
REQUIRED_REFRESH="30s"

if [ "$REFRESH_INT" = "$REQUIRED_REFRESH" ]; then
    ok "refresh_interval = $REFRESH_INT"
else
    fail "refresh_interval = '$REFRESH_INT' (required '$REQUIRED_REFRESH')"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        uci set nlbwmon.@nlbwmon[0].refresh_interval="$REQUIRED_REFRESH"
        uci commit nlbwmon
        ok "Set refresh_interval = $REQUIRED_REFRESH"
    fi
fi

# 5. Check database_directory
echo ""
echo "--- database_directory Check ---"
DB_DIR=$(get_opt database_directory)
REQUIRED_DIR="/root/nlbwmon"

if [ "$DB_DIR" = "$REQUIRED_DIR" ]; then
    ok "database_directory = $DB_DIR"
else
    fail "database_directory = '$DB_DIR' (required '$REQUIRED_DIR')"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        uci set nlbwmon.@nlbwmon[0].database_directory="$REQUIRED_DIR"
        uci commit nlbwmon
        mkdir -p "$REQUIRED_DIR"
        ok "Set database_directory = $REQUIRED_DIR"
    fi
fi

# 6. Check sysupgrade.conf
echo ""
echo "--- sysupgrade.conf Check ---"
SYSUPGRADE_FILE="/etc/sysupgrade.conf"
DB_DIR=$(get_opt database_directory)

if [ -f "$SYSUPGRADE_FILE" ] && grep -q "^${DB_DIR}$" "$SYSUPGRADE_FILE"; then
    ok "$DB_DIR is in sysupgrade.conf"
else
    fail "$DB_DIR is NOT in sysupgrade.conf (data will be lost on upgrade!)"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        echo "$DB_DIR" >> "$SYSUPGRADE_FILE"
        ok "Added $DB_DIR to sysupgrade.conf"
    fi
fi

# 7. Check database_interval ends with /1
echo ""
echo "--- database_interval Check ---"
DB_INTERVAL=$(get_opt database_interval)

if echo "$DB_INTERVAL" | grep -q '/1$'; then
    ok "database_interval = $DB_INTERVAL (daily split)"
else
    fail "database_interval = '$DB_INTERVAL' (must end with /1 for daily split)"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        if [ -n "$DB_INTERVAL" ]; then
            BASE_DATE=$(echo "$DB_INTERVAL" | cut -d'/' -f1)
        else
            BASE_DATE=$(date +%Y-%m-%d)
        fi
        NEW_INTERVAL="${BASE_DATE}/1"
        uci set nlbwmon.@nlbwmon[0].database_interval="$NEW_INTERVAL"
        uci commit nlbwmon
        ok "Set database_interval = $NEW_INTERVAL"
    fi
fi

# 8. Check database_limit and database_generations
echo ""
echo "--- database_limit & database_generations Check ---"

DB_LIMIT=$(get_opt database_limit)
DB_GENS=$(get_opt database_generations)
REQUIRED_LIMIT=10000
REQUIRED_GENS=100000

if [ -z "$DB_LIMIT" ]; then
    DB_LIMIT=0
fi
if [ "$DB_LIMIT" -ge "$REQUIRED_LIMIT" ] 2>/dev/null; then
    ok "database_limit = $DB_LIMIT (>= $REQUIRED_LIMIT)"
else
    fail "database_limit = $DB_LIMIT (required >= $REQUIRED_LIMIT)"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        uci set nlbwmon.@nlbwmon[0].database_limit="$REQUIRED_LIMIT"
        uci commit nlbwmon
        ok "Set database_limit = $REQUIRED_LIMIT"
    fi
fi

if [ -z "$DB_GENS" ]; then
    DB_GENS=0
fi
if [ "$DB_GENS" -ge "$REQUIRED_GENS" ] 2>/dev/null; then
    ok "database_generations = $DB_GENS (>= $REQUIRED_GENS)"
else
    fail "database_generations = $DB_GENS (required >= $REQUIRED_GENS)"
    ERRORS=$((ERRORS + 1))
    if ask_fix; then
        uci set nlbwmon.@nlbwmon[0].database_generations="$REQUIRED_GENS"
        uci commit nlbwmon
        ok "Set database_generations = $REQUIRED_GENS"
    fi
fi

# 9. Check free disk space
echo ""
echo "--- Disk Space Check ---"
DB_DIR=$(get_opt database_directory)
REQUIRED_SPACE_MB=30

if [ -d "$DB_DIR" ]; then
    CHECK_PATH="$DB_DIR"
else
    CHECK_PATH="/"
fi

FREE_KB=$(df -k "$CHECK_PATH" 2>/dev/null | tail -1 | awk '{print $4}')
FREE_MB=$((FREE_KB / 1024))

if [ "$FREE_MB" -ge "$REQUIRED_SPACE_MB" ] 2>/dev/null; then
    ok "Free disk space: ${FREE_MB}MB (>= ${REQUIRED_SPACE_MB}MB)"
else
    fail "Free disk space: ${FREE_MB}MB (required >= ${REQUIRED_SPACE_MB}MB)"
    ERRORS=$((ERRORS + 1))
    warn "Please free up disk space manually!"
fi

# 10. Check RAM
echo ""
echo "--- RAM Check ---"
REQUIRED_RAM_MB=128

TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))

if [ "$TOTAL_RAM_MB" -ge "$REQUIRED_RAM_MB" ] 2>/dev/null; then
    ok "Total RAM: ${TOTAL_RAM_MB}MB (>= ${REQUIRED_RAM_MB}MB)"
else
    fail "Total RAM: ${TOTAL_RAM_MB}MB (required >= ${REQUIRED_RAM_MB}MB)"
    ERRORS=$((ERRORS + 1))
    warn "Insufficient RAM. nlbwmon may have issues!"
fi

# Summary
echo ""
echo "========================================="
if [ "$ERRORS" -eq 0 ]; then
    printf "${GREEN}All checks passed!${NC}\n"
else
    printf "${YELLOW}Issues found: $ERRORS${NC}\n"
    echo ""
    printf "Restart nlbwmon to apply changes? [y/N]: "
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        /etc/init.d/nlbwmon restart
        ok "nlbwmon restarted"
    fi
fi
echo "========================================="

}

main "$@"
