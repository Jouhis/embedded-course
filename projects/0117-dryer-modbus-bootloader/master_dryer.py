"""Modbus RTU master for the filament dryer (lesson 117). Plain Python 3, adapted from lesson 101's master_modbus.py.

Talks to the simulated USART1 through Wokwi's RFC 2217 port (wokwi.toml: rfc2217ServerPort = 4000).
Needs pyserial, which you install yourself:  pip install pyserial

  python master_dryer.py selftest              CRC and frame checks only, no serial port
  python master_dryer.py status                read the eight status registers and print them
  python master_dryer.py material PETG         select a material (only accepted while IDLE)
  python master_dryer.py start                 send the start/stop command (same as the button)

Options: --port URL (default rfc2217://localhost:4000), --slave N (default 1).
The register map is in app/regmap.h. The CRC here is written separately from the C code, so the two
check each other. Run it without -I: pip installs pyserial into the user site folder by default.
"""
import argparse
import struct
import sys

DEFAULT_URL = "rfc2217://localhost:4000"
BAUD = 115200
SILENCE_S = 0.00175          # Modbus RTU: 3.5 characters, fixed at 1.750 ms above 19200 baud
READ_HOLDING = 0x03
WRITE_SINGLE = 0x06

# Register addresses, the same numbers as app/regmap.h.
REG_SETPOINT_C, REG_STATE, REG_TEMP_X10, REG_PWM_PCT = 0, 1, 2, 3
REG_FAULT_CODE, REG_REMAINING_MIN, REG_COMMAND, REG_MATERIAL = 4, 5, 6, 7
REG_COUNT = 8

STATES = ["IDLE", "HEATING", "HOLDING", "COOLDOWN", "FAULT"]
FAULTS = ["none", "over-temperature", "sensor", "runaway", "stale"]
MATERIALS = {"PLA": 0, "PETG": 1, "ABS": 2}
CMD_START_STOP = 1


def crc16_modbus(data: bytes) -> int:
    """CRC-16/MODBUS: reflected polynomial 0xA001, initial value 0xFFFF, no final XOR."""
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return crc


def with_crc(body: bytes) -> bytes:
    """Append the CRC low byte first, as Modbus RTU sends it."""
    return body + struct.pack("<H", crc16_modbus(body))


def check_crc(frame: bytes) -> bool:
    """True when the last two bytes are the CRC of everything before them."""
    return len(frame) >= 4 and crc16_modbus(frame[:-2]) == struct.unpack("<H", frame[-2:])[0]


def read_request(slave: int, start: int, qty: int) -> bytes:
    return with_crc(struct.pack(">BBHH", slave, READ_HOLDING, start, qty))


def write_request(slave: int, reg: int, value: int) -> bytes:
    return with_crc(struct.pack(">BBHH", slave, WRITE_SINGLE, reg, value))


def parse_read_response(frame: bytes, slave: int, qty: int) -> list:
    """Return the register values (unsigned 16-bit), or raise ValueError describing what went wrong."""
    if not check_crc(frame):
        raise ValueError("bad CRC in response")
    if frame[0] != slave:
        raise ValueError(f"response from slave {frame[0]}, expected {slave}")
    if frame[1] & 0x80:
        raise ValueError(f"exception code {frame[2]} (function {frame[1] & 0x7F:#04x})")
    if frame[1] != READ_HOLDING or frame[2] != 2 * qty or len(frame) != 3 + 2 * qty + 2:
        raise ValueError("unexpected response length or function")
    return [struct.unpack(">H", frame[3 + 2 * i:5 + 2 * i])[0] for i in range(qty)]


def decode_status(regs: list) -> dict:
    """Turn the raw registers into the values the learner reads. Temperature is signed tenths of a degree."""
    temp_tenths = struct.unpack("<h", struct.pack("<H", regs[REG_TEMP_X10]))[0]
    return {
        "setpoint_c": regs[REG_SETPOINT_C],
        "state": STATES[regs[REG_STATE]] if regs[REG_STATE] < len(STATES) else f"? {regs[REG_STATE]}",
        "temp_c": temp_tenths / 10.0,
        "pwm_pct": regs[REG_PWM_PCT],
        "fault": FAULTS[regs[REG_FAULT_CODE]] if regs[REG_FAULT_CODE] < len(FAULTS) else f"? {regs[REG_FAULT_CODE]}",
        "remaining_min": regs[REG_REMAINING_MIN],
        "material": ["PLA", "PETG", "ABS"][regs[REG_MATERIAL]] if regs[REG_MATERIAL] < 3 else "?",
    }


def selftest() -> int:
    # The standard CRC-16/MODBUS check value, and an empty input (the initial value).
    assert crc16_modbus(b"123456789") == 0x4B37, hex(crc16_modbus(b"123456789"))
    assert crc16_modbus(b"") == 0xFFFF
    # Frames whose CRC bytes were computed by the C host tests (lesson 101, test_modbus.c).
    assert read_request(1, 0, 2) == bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0B])
    assert write_request(1, REG_COMMAND, CMD_START_STOP) == with_crc(bytes([1, 6, 0, 6, 0, 1]))
    # A corrupted frame must fail the check.
    assert not check_crc(bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0A]))
    # A negative temperature: -5.0 C is 0xFFCE in the register (-50 tenths), read back as signed.
    assert decode_status([0, 0, 0xFFCE, 0, 0, 0, 0, 0])["temp_c"] == -5.0
    print("selftest OK: CRC-16/MODBUS 123456789 = 0x4B37, frames match, signed temperature decodes")
    return 0


def transact(port, request: bytes) -> bytes:
    """Send one request and read the reply until the line has been silent for 3.5 characters."""
    import time
    port.reset_input_buffer()
    port.write(request)
    port.flush()
    reply = bytearray()
    deadline = time.monotonic() + 2.0
    last = None
    while time.monotonic() < deadline:
        chunk = port.read(port.in_waiting or 1)
        if chunk:
            reply += chunk
            last = time.monotonic()
        elif reply and last is not None and time.monotonic() - last >= SILENCE_S:
            break
    return bytes(reply)


def main(argv) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["selftest", "status", "material", "start"])
    ap.add_argument("value", nargs="?", help="material name for the material command: PLA, PETG or ABS")
    ap.add_argument("--port", default=DEFAULT_URL)
    ap.add_argument("--slave", type=int, default=1)
    a = ap.parse_args(argv)

    if a.command == "selftest":
        return selftest()
    if a.command == "material" and a.value not in MATERIALS:
        ap.error("material must be PLA, PETG or ABS")

    import serial  # pyserial: pip install pyserial
    port = serial.serial_for_url(a.port, baudrate=BAUD, timeout=0.05)
    try:
        if a.command == "status":
            req = read_request(a.slave, 0, REG_COUNT)
            reply = transact(port, req)
            regs = parse_read_response(reply, a.slave, REG_COUNT)
            for name, value in decode_status(regs).items():
                print(f"{name:14} {value}")
        elif a.command == "material":
            reply = transact(port, write_request(a.slave, REG_MATERIAL, MATERIALS[a.value]))
            print("material echo ok" if reply == write_request(a.slave, REG_MATERIAL, MATERIALS[a.value])
                  else f"unexpected reply: {reply.hex(' ') or '(none)'}")
        else:
            reply = transact(port, write_request(a.slave, REG_COMMAND, CMD_START_STOP))
            print("command echo ok" if reply == write_request(a.slave, REG_COMMAND, CMD_START_STOP)
                  else f"unexpected reply: {reply.hex(' ') or '(none)'}")
    finally:
        port.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
