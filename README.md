# HomeWizard P1 to Victron

Home Assistant add-on that bridges a HomeWizard P1 energy meter to Victron Venus OS by emulating a Carlo Gavazzi EM24 grid meter via Modbus TCP.

**No modifications to your Victron GX device required.**

## How it works

1. Polls your HomeWizard P1 meter's local API every second
2. Runs a Modbus TCP server that emulates a Carlo Gavazzi EM24 energy meter
3. Venus OS connects to it and sees a real grid meter with live data

## Installation

### As Home Assistant add-on

1. In Home Assistant go to **Settings > Add-ons > Add-on Store**
2. Click the three dots (top right) > **Repositories**
3. Add: `https://github.com/HeroBanana/victron-p1`
4. Find "HomeWizard P1 to Victron" under the new repository and click **Install**
5. Go to the **Configuration** tab and set your HomeWizard P1 IP address
6. **Start** the add-on

### Standalone (Node.js)

```bash
git clone https://github.com/HeroBanana/victron-p1.git
cd victron-p1/victron-p1
npm install
```

```bash
sudo HOMEWIZARD_IP=192.168.1.188 POLL_INTERVAL=1000 MODBUS_PORT=502 node index.js
```

Or with a `.env` file (Node.js 20+):

```bash
sudo node --env-file=.env index.js
```

## Venus OS setup

1. Go to **Settings > Modbus TCP Devices**
2. Add the IP address of the machine running this add-on
3. Venus OS will auto-detect a Carlo Gavazzi EM24 grid meter

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `homewizard_ip` | `192.168.1.188` | IP address of your HomeWizard P1 meter |
| `poll_interval` | `1000` | Polling interval in milliseconds |

## Data provided

- Per-phase voltage (L1, L2, L3)
- Per-phase current (L1, L2, L3)
- Per-phase power (L1, L2, L3)
- Total power
- Total energy imported (kWh)
- Total energy exported (kWh)

## Requirements

- HomeWizard P1 meter with local API enabled
- Victron Venus OS (GX device, Cerbo, etc.)
- Home Assistant (for add-on install) or any machine with Node.js (for standalone)
