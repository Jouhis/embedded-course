# Proposals from the depth pass on lessons 0113, 0114, 0115 and 0116

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Industrial communication

**Master (Modbus)**:
The device that starts every Modbus conversation. It sends a request and waits for a reply, and a slave never transmits unless a master asks.
_Avoid_: Client (the usual name in networking, but not in Modbus documents), host (use it only for the PC side of a course project)

**Slave (Modbus)**:
A device that answers requests from a master, identified by its address (1 to 247). It replies only to its own address, and it stays silent after a frame that it cannot process.
_Avoid_: Server (in Modbus documents), follower

**Exception code (Modbus)**:
The one-byte reason in an exception reply, sent with the function code's top bit set (0x80). Code 02 is an illegal data address and code 03 is an illegal data value.
_Avoid_: Error code (too general; a CRC failure gets no reply at all)

## Peripherals

**Overrun error (UART)**:
The receiver's error when a new byte arrives before the previous one was read. The overrun flag must be cleared, here by reading the status register and then the data register, before the receiver accepts more bytes.
_Avoid_: Buffer overflow (the hardware has no software buffer in this sense)

## Protocols and numbers

**One's complement**:
The bitwise inverse of a number, in which every 0 becomes 1 and every 1 becomes 0. Adding 1 to it gives the two's complement of the original value.
_Avoid_: Negation (negation is the arithmetic operation, which two's complement implements with the one's complement plus one)

**RFC 2217**:
An internet standard for carrying a serial port over a TCP connection, including the line settings. The Wokwi simulator uses it to expose USART1 on a local port.
_Avoid_: Virtual COM port (a product name for a driver, not the protocol)

## Resource proposals (RESOURCES.md format)

- [Modbus over Serial Line specification (modbus.org)](https://www.modbus.org/specs.php)
  Not opened in this pass: modbus.org returned 404 and 403 to the fetch tool. Lesson 0113 cites it by title for the 3.5-character silent interval and the 1.750 ms value above 19 200 bit/s, and says so. Check both values in the document before the merge.
- [RFC 2217: Telnet COM Port Control Option (rfc-editor.org)](https://www.rfc-editor.org/rfc/rfc2217)
  Not fetched in this pass. Lesson 0113 mentions RFC 2217 in one sentence and does not link it yet.
