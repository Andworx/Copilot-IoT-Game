# RJ-45 cable port build plan

This replaces the earlier custom connector matrix. The panel now uses four identical RJ-45 panel jacks labeled **LAN 1**, **LAN 2**, **LAN 3**, and **LAN 4**, plus standard straight-through RJ-45 patch cables. Cable identity does not matter; the Pi only detects which two ports are connected.

## Wiring rule

Wire exactly one contact on each RJ-45 jack: **RJ-45 pin 4**. Leave every other RJ-45 contact open. Do not connect any RJ-45 contact, shield, drain, or jack shell to ground.

RJ-45 pin 4 is the blue conductor in both T568A and T568B patch cables, which makes it easy to trace and keeps the design independent of A/B termination style.

| Panel label | Firmware name | RJ-45 jack contact | Pi BCM GPIO | Pi physical header pin |
|---|---|---:|---:|---:|
| LAN 1 | S1 | Pin 4 | GPIO4 | Pin 7 |
| LAN 2 | S2 | Pin 4 | GPIO25 | Pin 22 |
| LAN 3 | S3 | Pin 4 | GPIO2 | Pin 3 |
| LAN 4 | S4 | Pin 4 | GPIO3 | Pin 5 |

Unused previous socket lines are no longer part of the cable matrix: GPIO7, GPIO12, GPIO16, GPIO18, GPIO20, and GPIO24 should be disconnected from the panel sockets.

## Valid links

Any standard straight-through RJ-45 patch cable creates one detectable bridge between two ports. The firmware reports each valid link as `{"cable": 1, "sockets": ["Sx", "Sy"]}` where `cable: 1` means generic RJ-45 patch cable.

| Required link | Firmware link | Expected raw bridge |
|---|---|---|
| LAN 1-LAN 2 | S1-S2 | `S1 pin 4 <-> S2 pin 4` |
| LAN 1-LAN 3 | S1-S3 | `S1 pin 4 <-> S3 pin 4` |
| LAN 1-LAN 4 | S1-S4 | `S1 pin 4 <-> S4 pin 4` |
| LAN 2-LAN 3 | S2-S3 | `S2 pin 4 <-> S3 pin 4` |
| LAN 2-LAN 4 | S2-S4 | `S2 pin 4 <-> S4 pin 4` |
| LAN 3-LAN 4 | S3-S4 | `S3 pin 4 <-> S4 pin 4` |

Two cables can be used at the same time when they do not share a port, such as S1-S2 plus S3-S4.

## Mode recipes

| Mode | Required RJ-45 links | Device story |
|---|---|---|
| thermostat | LAN 1-LAN 2 | Reconnect the room sensor to the controller. |
| coldchain-sensor | LAN 1-LAN 3 | Connect the refrigerated cargo probe rather than the room sensor port. |
| elevator | LAN 1-LAN 2 | Restore local landing-position feedback. |
| patient-monitor | LAN 1-LAN 3 | Restore the patient data lead to its acquisition port. |
| drone-ground-control | LAN 1-LAN 4 | Cross-connect the ground station and flight-link interlock. |
| ev-charger | LAN 1-LAN 2 + LAN 3-LAN 4 | Connect both the vehicle pilot and remote authorization links. |
| field-radio | LAN 2-LAN 4 | Restore the remote radio control link. |
| industrial-robot-arm | LAN 3-LAN 4 | Reconnect the remote teach-pendant interlock. |
| retail-kiosk | LAN 2-LAN 3 | Route the payment communications link through the local controller. |
| smart-lock | LAN 1-LAN 4 + LAN 2-LAN 3 | Reconnect the credential-reader communications link. |
| traffic-signal | LAN 1-LAN 3 + LAN 2-LAN 4 | Restore both the detector loop and the remote coordination link. |
| water-pump | LAN 1-LAN 2 + LAN 3-LAN 4 | Restore local pressure feedback and remote pump permission together. |

Some modes now share the same cable-pair recipe. That is okay because the active mode comes from the Power App/Page, and the switch positions still differ by mode.

## Continuity checks

Before connecting the jacks to the Pi:

1. With no patch cables plugged in, confirm every RJ-45 pin 4 is open from every other RJ-45 pin 4.
2. Confirm each RJ-45 pin 4 is open to ground, the panel metal, switch returns, and jack shield/drain tabs.
3. Plug a straight-through patch cable between each pair and confirm only pin 4 bridges between those two ports.
4. Do not use crossover cables, Ethernet couplers with electronics, magnetics modules, or shielded jacks whose shield is tied to a contact.

After wiring the Pi, stop the panel service and run the live scanner:

```bash
cd /home/pi/restore-and-spin/hardware/raspberry-pi
sudo systemctl stop restore-and-spin-panel.service
.venv/bin/python3 diagnose_cables.py --watch
```

With no cables connected, expect no bridges and all sockets open. With a cable between LAN 1 and LAN 3, expect only:

```text
bridges: ['S1 pin 4 <-> S3 pin 4']
cables:  [{'cable': 1, 'sockets': ['S1', 'S3']}]
sockets: {'S1': 'connected', 'S2': 'open', 'S3': 'connected', 'S4': 'open'}
```

Restart the service after testing:

```bash
sudo systemctl start restore-and-spin-panel.service
```
