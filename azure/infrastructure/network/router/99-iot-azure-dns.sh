#!/bin/sh
# GL.iNet Beryl AX (GL-MT3000, OpenWrt) hotplug hook for the Azure private DNS path.
# Install on the router as /etc/hotplug.d/iface/99-iot-azure-dns (no extension, chmod +x).
# See azure/infrastructure/network/router/README.md.
#
# On every ovpnclient1 up/update it
#   1. installs the main-table host route to the Azure DNS resolver, and
#   2. re-adds any missing conditional DNS forward to that resolver, restarting dnsmasq
#      only when something had to be added.
# Step 2 self-heals the forwards when a VPN profile change, reset, or vendor UI action
# rewrites /etc/config/dhcp. Public names are untouched: only the listed suffixes forward.

[ "$INTERFACE" = "ovpnclient1" ] || exit 0

RESOLVER="10.20.3.4"
SUFFIXES="azure-devices.net servicebus.windows.net service.signalr.net azurewebsites.net blob.core.windows.net"

case "$ACTION" in
  ifup|ifupdate)
    ip route replace "$RESOLVER/32" dev ovpnclient1 table main &&
      logger -t iot-azure-dns "Installed Azure DNS route in main table"

    changed=0
    existing="$(uci -q get dhcp.@dnsmasq[0].server)"
    for d in $SUFFIXES; do
      entry="/$d/$RESOLVER"
      case " $existing " in
        *" $entry "*) ;;
        *)
          uci add_list dhcp.@dnsmasq[0].server="$entry"
          changed=1
          logger -t iot-azure-dns "Restored missing DNS forward $entry"
          ;;
      esac
    done
    if [ "$changed" = 1 ]; then
      uci commit dhcp
      /etc/init.d/dnsmasq restart
    fi
    ;;
  ifdown)
    ip route del "$RESOLVER/32" dev ovpnclient1 table main 2>/dev/null
    ;;
esac
