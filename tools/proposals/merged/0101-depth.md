# Proposed glossary additions from the depth pass (lessons 0101-0103)

Format follows GLOSSARY.md. Lead merges these; do not copy them into GLOSSARY.md by hand from this file without checking for duplicates.

## Embedded C / Firmware (proposed for "Firmware and tools")

**Magic value**:
A constant that a valid image stores at a known place, so a bootloader can tell an image from erased or old flash. Erased flash reads as all ones. A magic value says the data looks like an image; it does not prove the image is intact.
_Avoid_: Signature (a signature is a keyed proof of origin, which a magic value is not)

**Thumb bit**:
Bit 0 of a function address on Cortex-M. It is set in every valid reset handler address, because Cortex-M cores run only Thumb code. A branch to an address with bit 0 clear starts execution in the wrong state.
_Avoid_: Thumb flag (acceptable in conversation, but use the bit name in code and checks)

## Communication (proposed for "Communication")

**CRC residue**:
The value a CRC takes over a frame that has its own CRC appended big-endian. For CRC-16/CCITT-FALSE, which has no final XOR and no reflection, it is zero for every intact frame.
_Avoid_: Checksum (a CRC residue is a property of a CRC, not an addition)

## Security (proposed for "Firmware and tools" or a new "Security" group)

**MAC (message authentication code)**:
A short tag computed from a message and a secret key, so that only holders of the key can produce a valid tag. Unlike a CRC, a forger without the key cannot recompute it.
_Avoid_: Checksum, hash (a plain hash has no key, so anyone can recompute it)

**Authenticity**:
The property that data came from a holder of a secret key. A MAC or a signature provides it. Integrity (the bytes did not change) and secrecy (nobody can read them) are separate properties.
_Avoid_: Security (too broad to test for)

## RESOURCES.md proposals

- MCUboot design (docs.mcuboot.com/design.html) already listed. This build confirmed: 32-byte header, magic 0x96f3b83d, swap types TEST, PERM and REVERT, image-OK flag in the image trailer. The page has no swap type named "confirm".
- Cheshire and Baker, "Consistent Overhead Byte Stuffing" (stuartcheshire.org/papers/COBSforToN/) already listed. This build confirmed the bound: "no more than one byte in 254" and code 0xFF meaning 254 data bytes with no implicit zero (section III.A).
