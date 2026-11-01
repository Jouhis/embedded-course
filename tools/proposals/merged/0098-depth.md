# Proposals from the depth expansion of lessons 0098 to 0100

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files. `Stub` and `Modbus RTU` already exist in the glossary and are not repeated here.

## Glossary terms (add to the group shown)

### Electronics (group: Electronics)

**Differential pair**:
Two wires that carry one signal as the voltage difference between them, such as CANH and CANL or A and B. Noise that reaches both wires equally cancels in the difference.
_Avoid_: Differential line (acceptable in conversation), balanced pair (acceptable in TI text)

**Common-mode voltage**:
The voltage that two wires of a differential pair share, or the difference between the grounds of two nodes that a bus must tolerate. A differential receiver ignores it.
_Avoid_: Common mode (without "voltage" in formal text)

**Termination (bus)**:
A resistor at each end of a cable, matched to the cable's characteristic impedance, so that signals do not reflect back along it. CAN and RS-485 buses use 120 Ω at each end.
_Avoid_: Pull resistor (a pull sets a default level, it does not stop reflections)

**Half-duplex**:
A link in which one pair of wires carries traffic in both directions, but only one end may drive it at a time.
_Avoid_: Simplex (one direction only), full-duplex (both directions at once)

### Communication (group: Communication)

**Transceiver**:
The analogue chip between a controller's logic-level TX and RX pins and a differential bus. It drives the bus levels and limits fault current.
_Avoid_: Driver (a driver is software or a bus-driver stage inside the transceiver), PHY (acceptable in networking texts)

**RS-485**:
A TIA/EIA-485 differential, half-duplex serial standard for multi-node buses. It defines the electrical levels and not the message format, which is the job of a protocol such as Modbus RTU.
_Avoid_: RS485 (no hyphen), RS-232 (a different, single-ended standard)

**Driver enable (DE)**:
The transceiver pin that switches its bus driver on (high) or puts its outputs in high impedance (low). A node must raise it only for its own reply.
_Avoid_: TX enable (informal)

**Receiver enable (RE)**:
The transceiver pin that enables the receiver when low. When high, the receiver output is high impedance.
_Avoid_: RX enable (informal)

**Error frame**:
A CAN frame that a node sends to break a corrupt frame on purpose. An active error frame is six dominant bits in a row, which violates the stuffing rule, so every node sees the error.
_Avoid_: Error packet (not the CAN term)

**Bit error**:
A CAN error in which a transmitter reads back a level different from the one it sent. Arbitration and the ACK slot are the exceptions, where a recessive bit overwritten by a dominant one is normal.
_Avoid_: Bit flip (a physical event, not the protocol error)

**Stuff error**:
A CAN error in which six identical bits follow each other where a stuff bit should be.
_Avoid_: Stuffing error (acceptable in conversation)

**Form error**:
A CAN error in which a fixed-form field, such as the CRC delimiter, the ACK delimiter or the end of frame, carries an illegal dominant bit.
_Avoid_: Frame error (too vague)

**ACK error**:
A CAN error in which the transmitter finds the ACK slot still recessive, so no node accepted the frame.
_Avoid_: No-ack (informal)

**Transmit error counter (TEC)**:
The CAN counter that rises by 8 each time a node sends an error flag, and falls by 1 after each good frame it sends. A value of 128 or more makes the node error-passive, and 256 or more makes it bus-off.
_Avoid_: TX error count (acceptable in Bosch text)

**Receive error counter (REC)**:
The CAN counter that rises by 1 on each receive error, and falls by 1 after each good frame received. A value of 128 or more makes the node error-passive.
_Avoid_: RX error count (acceptable in Bosch text)

### USB (group: Communication)

**Control transfer**:
The USB transfer type used for setup and requests, with a setup stage, an optional data stage and a status stage. Endpoint 0 is always a control endpoint.
_Avoid_: Control packet

**Interrupt transfer**:
A USB transfer type for small, time-bounded messages. The host polls the endpoint at the interval in its endpoint descriptor, and a corrupt packet is retried in the next period.
_Avoid_: Hardware interrupt (a CPU exception, a different thing)

**Bulk transfer**:
A USB transfer type for large blocks of data, with error correction and retransmission, using the bandwidth left after the other transfers. It has no latency guarantee.
_Avoid_: Block transfer (informal)

**Isochronous transfer**:
A USB transfer type with guaranteed bandwidth and bounded latency, for streams. Errors are detected by CRC but bad data is not retried.
_Avoid_: Streaming (acceptable in conversation)

**SET_ADDRESS**:
The standard USB control request, code 0x05, that gives a device its unique address after it has answered at address 0.
_Avoid_: Assign address (the request name)

**SET_CONFIGURATION**:
The standard USB control request, code 0x09, that selects a device configuration and activates its endpoints.
_Avoid_: Select config (informal)

**GET_DESCRIPTOR**:
The standard USB control request, code 0x06, that returns a descriptor. A configuration request returns the configuration, interface and endpoint descriptors together.
_Avoid_: Read descriptor (informal)

## Resources (add or update)

- **Update** the Bosch CAN 2.0 entry (`https://www.nxp.com/docs/en/reference-manual/BCANPSV2.pdf`): now opened in this build. The copy is the Rev 3 "Bosch Controller Area Network (CAN) Version 2.0, Protocol Standard" (BCANPSV2.0/D), with Freescale branding. Sections used: 2.7 (arbitration), 3.2.1.3 (control field), 3.2.1.5 (CRC), 3.4 (bit stream coding), 4.1 (error types), 5.1 (node status and counter rules 1 to 12). Replace "Found by search, not opened" with "Opened in this build".
- **Update** the TI SLOA101 entry: section numbers used in lesson 98 are 3.1 (bit fields, Figure 2), 4.1 (arbitration, Figure 5), 4.4 (error checking, stuffing, error frames), 5 and 5.1 (bus levels, termination, transceiver, Figure 7). It was opened in this build.
- **New** `TI SN65HVD3082E / SN75HVD3082E / SN65HVD3085E / SN65HVD3088E, SNx5HVD308xE Low-Power RS-485 Transceivers (Texas Instruments, SLLS562O, revised July 2023)`, `https://www.ti.com/lit/ds/symlink/sn65hvd3082e.pdf`. Use for: lesson 99 (DE and RE function tables, section 8.4 and Tables 8-1 and 8-2; fail-safe receiver, section 8.3; parallel termination and stub length, sections 9.2 and 9.2.1.2; the differential load resistance of 54 to 60 Ω in the recommended operating conditions). Opened in this build.
- **New** `Beyond Logic, USB in a NutShell, pages usb1 to usb6 (https://www.beyondlogic.org/usbnutshell/)`. Use for: lesson 100 (transfer types, interrupt polling, payload limits, descriptors, enumeration order, request codes 0x05, 0x06 and 0x09). Opened in this build. The existing entry points at the first page only; the other pages are the same site.
- **Not opened**: `Modbus over Serial Line Specification V1.02` and `Modbus Application Protocol Specification V1.1b3` at modbus.org. Both PDFs returned HTTP 403 from this build and were not worked around. Lesson 99 cites them by title only, and the 1.750 ms silence and the exception codes stay unchecked against the originals (the exception codes do match the project header).
