# Router DNS for Azure private endpoints

The travel router (GL.iNet GL-MT3000) must forward five Azure suffixes to the private DNS
resolver `10.20.3.4` over the VPN. Without the forwards, LAN clients and the Pi resolve the
public addresses instead of the private endpoints. Router config is outside ARM and Bicep.

| Suffix | Forwarded to |
|---|---|
| `azure-devices.net`, `servicebus.windows.net`, `service.signalr.net`, `azurewebsites.net`, `blob.core.windows.net` | `10.20.3.4` |

## Why this needs protecting

On 2026-10-09, after the router moved to the destination VPN gateway, `/etc/config/dhcp` had
no `server` entries and the router returned public IPs for all five services. The cause was not
captured; a VPN profile change, reset or firmware upgrade can each remove custom `dnsmasq`
lines or hotplug files. The forwards were restored by hand, and
[`99-iot-azure-dns.sh`](99-iot-azure-dns.sh) now re-adds them on every VPN up/update.

## Install

From a machine on the LAN:

```sh
scp 99-iot-azure-dns.sh root@192.168.8.1:/etc/hotplug.d/iface/99-iot-azure-dns
ssh root@192.168.8.1 'chmod +x /etc/hotplug.d/iface/99-iot-azure-dns && \
  grep -qx /etc/hotplug.d/iface/99-iot-azure-dns /etc/sysupgrade.conf || \
  echo /etc/hotplug.d/iface/99-iot-azure-dns >> /etc/sysupgrade.conf'
```

Then restart the VPN client (or reboot) and confirm `logread | grep iot-azure-dns` shows the
route install. The `sysupgrade.conf` line keeps the hook through firmware upgrades that keep
settings; it does not survive a factory reset.

## Back up

After any router or VPN change, store a copy off the router:

```sh
ssh root@192.168.8.1 'sysupgrade -b -' > router-$(date +%F).tar.gz
```

Restore with `sysupgrade -r <file>` followed by a reboot.

## Verify

Run after VPN profile changes, firmware updates and reboots. Every line must print a `10.20.1.x`
address; the last must be a normal public address.

```powershell
foreach ($n in 'evhns-aw-iot-copilot.servicebus.windows.net','iothub-aw-iot-copilot.azure-devices.net',
  'signalr-aw-iot-copilot.service.signalr.net','func-aw-iot-game-v2.azurewebsites.net',
  'stawazcomiotgamev2.blob.core.windows.net','microsoft.com') {
  "$n -> " + ((nslookup $n 192.168.8.1 | Select-String '^Address' | Select-Object -Last 1) -replace 'Address:\s*','')
}
```

For TCP evidence per service use `scripts/Test-DemoNetwork.ps1 -RouterDns 192.168.8.1 -AzureDns 10.20.3.4`.
The router's own lookups also need the `10.20.3.4/32` main-table route, which the hook installs.
