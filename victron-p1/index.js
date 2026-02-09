#!/usr/bin/env node

/**
 * HomeWizard P1 to Victron Energy Bridge
 * Emulates a Carlo Gavazzi EM24 energy meter via Modbus TCP
 * Venus OS auto-detects this as a grid meter — no GX modifications needed
 */

const ModbusRTU = require('modbus-serial');
const axios = require('axios');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    homewizard: {
        ip: process.env.HOMEWIZARD_IP || '192.168.1.188',
        pollInterval: parseInt(process.env.POLL_INTERVAL) || 1000,
    },
    modbus: {
        port: parseInt(process.env.MODBUS_PORT) || 502,
    },
    debug: process.env.DEBUG === 'true',
};

// ============================================
// REGISTER STORAGE
// ============================================

const registers = new Map();

/** Write a single UINT16 register */
function writeU16(addr, value) {
    registers.set(addr, value & 0xFFFF);
}

/** Write a signed 32-bit value as two registers in little-endian word order (CG convention) */
function writeS32LE(addr, value) {
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(Math.round(value), 0);
    registers.set(addr, buf.readUInt16LE(0));       // low word
    registers.set(addr + 1, buf.readUInt16LE(2));   // high word
}

// ============================================
// STATIC REGISTER INIT
// ============================================

function initRegisters() {
    // Model ID: EM24 Ethernet (1653 = 0x0675)
    writeU16(0x000B, 1653);

    // Hardware / Firmware version (1.1.0)
    writeU16(0x0302, 0x1100);
    writeU16(0x0304, 0x1100);

    // Phase config: 0 = 3-phase with neutral
    writeU16(0x1002, 0);

    // Serial number: "HWP1MTR" as ASCII in 7 registers (no spaces)
    const serial = 'HWP1MTR\0\0\0\0\0\0\0';
    for (let i = 0; i < 7; i++) {
        const hi = serial.charCodeAt(i * 2) || 0;
        const lo = serial.charCodeAt(i * 2 + 1) || 0;
        writeU16(0x5000 + i, (hi << 8) | lo);
    }

    // Application: 7 (mode H — required by Venus OS)
    writeU16(0xA000, 7);

    // Front switch: 3 (locked)
    writeU16(0xA100, 3);

    // Phase sequence: 0 = OK
    writeU16(0x0032, 0);

    // Frequency: 50.0 Hz (* 10)
    writeU16(0x0033, 500);

    // Zero all measurement registers
    const zeroRegs = [
        0x0000, 0x0002, 0x0004,         // voltages
        0x000C, 0x000E, 0x0010,         // currents
        0x0012, 0x0014, 0x0016, 0x0028, // power
        0x0034, 0x004E,                 // energy total
        0x0040, 0x0042, 0x0044,         // energy per phase
    ];
    zeroRegs.forEach(addr => writeS32LE(addr, 0));
}

// ============================================
// HOMEWIZARD POLLING
// ============================================

function updateRegisters(hw) {
    // Voltages (* 10)
    if (hw.active_voltage_l1_v !== undefined) writeS32LE(0x0000, hw.active_voltage_l1_v * 10);
    if (hw.active_voltage_l2_v !== undefined) writeS32LE(0x0002, hw.active_voltage_l2_v * 10);
    if (hw.active_voltage_l3_v !== undefined) writeS32LE(0x0004, hw.active_voltage_l3_v * 10);

    // Currents (* 1000)
    if (hw.active_current_l1_a !== undefined) writeS32LE(0x000C, hw.active_current_l1_a * 1000);
    if (hw.active_current_l2_a !== undefined) writeS32LE(0x000E, hw.active_current_l2_a * 1000);
    if (hw.active_current_l3_a !== undefined) writeS32LE(0x0010, hw.active_current_l3_a * 1000);

    // Power (* 10)
    if (hw.active_power_l1_w !== undefined) writeS32LE(0x0012, hw.active_power_l1_w * 10);
    if (hw.active_power_l2_w !== undefined) writeS32LE(0x0014, hw.active_power_l2_w * 10);
    if (hw.active_power_l3_w !== undefined) writeS32LE(0x0016, hw.active_power_l3_w * 10);
    if (hw.active_power_w !== undefined) writeS32LE(0x0028, hw.active_power_w * 10);

    // Energy (* 10, kWh)
    if (hw.total_power_import_kwh !== undefined) writeS32LE(0x0034, hw.total_power_import_kwh * 10);
    if (hw.total_power_export_kwh !== undefined) writeS32LE(0x004E, hw.total_power_export_kwh * 10);
}

async function pollHomeWizard() {
    try {
        const res = await axios.get(
            `http://${CONFIG.homewizard.ip}/api/v1/data`,
            { timeout: 5000 }
        );
        updateRegisters(res.data);

        const power = res.data.active_power_w || 0;
        const dir = power > 0 ? 'importing' : power < 0 ? 'exporting' : 'idle';
        console.log(`${Math.abs(power)}W ${dir}`);
    } catch (err) {
        console.error('HomeWizard poll failed:', err.message);
    }
}

// ============================================
// MODBUS TCP SERVER
// ============================================

const vector = {
    getHoldingRegister(addr, unitID) {
        if (unitID !== 1) return 0;
        const val = registers.get(addr) || 0;
        if (CONFIG.debug) console.log(`[Modbus] Read 0x${addr.toString(16).padStart(4, '0')} = ${val}`);
        return val;
    },
    getInputRegister(addr, unitID) {
        return registers.get(addr) || 0;
    },
    setRegister(addr, value, unitID) {
        if (CONFIG.debug) console.log(`[Modbus] Write 0x${addr.toString(16).padStart(4, '0')} = ${value}`);
        registers.set(addr, value);
    },
};

// ============================================
// START
// ============================================

initRegisters();

console.log('HomeWizard P1 to Victron Bridge (EM24 Modbus TCP Emulation)');
console.log(`  HomeWizard IP: ${CONFIG.homewizard.ip}`);
console.log(`  Modbus TCP port: ${CONFIG.modbus.port}`);
console.log(`  Poll interval: ${CONFIG.homewizard.pollInterval}ms`);

const server = new ModbusRTU.ServerTCP(vector, {
    host: '0.0.0.0',
    port: CONFIG.modbus.port,
    debug: false,
    unitID: 1,
});

server.on('socketError', (err) => {
    console.error('Modbus TCP error:', err.message);
});

server.on('initialized', () => {
    console.log(`Modbus TCP server listening on port ${CONFIG.modbus.port}`);
    console.log('Emulating: Carlo Gavazzi EM24 (Model ID 1653)');
    console.log('In Venus OS: Settings > Modbus TCP Devices > add this machine\'s IP');

    pollHomeWizard();
    setInterval(pollHomeWizard, CONFIG.homewizard.pollInterval);
});

// ============================================
// SHUTDOWN
// ============================================

function shutdown() {
    console.log('\nShutting down...');
    server.close(() => {
        console.log('Goodbye!');
        process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (err) => { console.error('Uncaught:', err); shutdown(); });
process.on('unhandledRejection', (err) => { console.error('Unhandled:', err); shutdown(); });
