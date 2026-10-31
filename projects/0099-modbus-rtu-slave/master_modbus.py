"""Modbus RTU master for the Pico slave in this project (lesson 99). Plain Python 3.

Talks to the simulated UART0 through Wokwi's RFC 2217 port (wokwi.toml: rfc2217ServerPort = 4000).
Needs pyserial, which you install yourself:  pip install pyserial

  python master_modbus.py selftest                 CRC and frame checks only, no serial port
  python master_modbus.py read 0 3                 read holding registers 0..2 (function 03)
  python master_modbus.py write 1 1                write register 1 = 1, LED on (function 06)

Run it without -I: pip installs pyserial into the user site folder by default, and -I hides that
folder. The -I flag is for the course's build tools (tools/*.py), not for this learner script.
Options: --port URL (default rfc2217://localhost:4000), --slave N (default 1).
The CRC here is written separately from the C code on purpose, so the two can check each other.
"""
import argparse
import struct
import sys

DEFAULT_URL = "rfc2217://localhost:4000"
BAUD = 115200
SILENCE_S = 0.00175   # Modbus RTU: 3.5 characters, fixed at 1.750 ms above 19200 baud
READ_HOLDING = 0x03
WRITE_SINGLE = 0x06


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
    """Return the register values, or raise ValueError describing what went wrong."""
    if not check_crc(frame):
        raise ValueError("bad CRC in response")
    if frame[0] != slave:
        raise ValueError(f"response from slave {frame[0]}, expected {slave}")
    if frame[1] & 0x80:
        raise ValueError(f"exception code {frame[2]} (function {frame[1] & 0x7F:#04x})")
    if frame[1] != READ_HOLDING or frame[2] != 2 * qty or len(frame) != 3 + 2 * qty + 2:
        raise ValueError("unexpected response length or function")
    return [struct.unpack(">H", frame[3 + 2 * i:5 + 2 * i])[0] for i in range(qty)]


def selftest() -> int:
    # The standard CRC-16/MODBUS check value, and an empty input (the initial value).
    assert crc16_modbus(b"123456789") == 0x4B37, hex(crc16_modbus(b"123456789"))
    assert crc16_modbus(b"") == 0xFFFF
    # Frames whose CRC bytes were computed by the C host tests (test_modbus.c).
    assert read_request(1, 0, 2) == bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0B])
    assert write_request(1, 1, 0x2A) == bytes([0x01, 0x06, 0x00, 0x01, 0x00, 0x2A, 0x59, 0xD5])
    # A corrupted frame must fail the check.
    assert not check_crc(bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0A]))
    print("selftest OK: CRC-16/MODBUS 123456789 = 0x4B37, frames match the C tests")
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
    ap.add_argument("command", choices=["selftest", "read", "write"])
    ap.add_argument("args", nargs="*", type=lambda s: int(s, 0))
    ap.add_argument("--port", default=DEFAULT_URL)
    ap.add_argument("--slave", type=int, default=1)
    a = ap.parse_args(argv)

    if a.command == "selftest":
        return selftest()

    import serial  # pyserial: pip install pyserial
    port = serial.serial_for_url(a.port, baudrate=BAUD, timeout=0.05)
    try:
        if a.command == "read":
            start, qty = a.args
            reply = transact(port, read_request(a.slave, start, qty))
            print("request:", read_request(a.slave, start, qty).hex(" "))
            print("reply:  ", reply.hex(" ") or "(none)")
            print("values: ", parse_read_response(reply, a.slave, qty))
        else:
            reg, value = a.args
            request = write_request(a.slave, reg, value)
            reply = transact(port, request)
            print("echo ok" if reply == request else f"unexpected reply: {reply.hex(' ') or '(none)'}")
    finally:
        port.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
