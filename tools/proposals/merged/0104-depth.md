# Proposals from the depth expansion of lessons 0104 to 0106

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files.

## Glossary terms (add to the groups shown)

### Signal processing and control (group: Signal processing)

**FIR filter (finite impulse response)**:
A filter whose output depends only on a finite window of past inputs, so an input has no effect once it leaves the window. The moving average is the simplest case.
_Avoid_: Windowed filter (a design method, not the filter class)

### Electronics (group: Electronics)

**Schematic**:
The drawing of a circuit as symbols for its parts, joined by wires and labelled nets. It defines the connections that the board must match.
_Avoid_: Circuit diagram (acceptable informally), netlist (the list of connections, not the drawing)

**Footprint**:
The copper pads and outline on a board that a part is soldered onto, taken from the package drawing in its datasheet. Each schematic symbol is linked to one footprint.
_Avoid_: Package (the part's case, not the board's pattern)

**Trace**:
A strip of copper on a board that carries a signal or a supply between pads.
_Avoid_: Track (acceptable in KiCad's own menus), wire (the schematic's line, not the copper)

**Ground pour**:
A large area of copper on a board, filled with the ground net, that gives every signal a low-impedance return path beneath it.
_Avoid_: Ground plane (the same idea on an inner layer of a multilayer board), copper fill (too general)

**PCB (printed circuit board)**:
The physical board: insulating core with copper layers, drilled and coated, with the parts soldered to it.
_Avoid_: PCB file (in KiCad, the board layout file, which is a different thing from the board itself)

## Resources (add to the groups shown)

### Vendor primary sources or tool documentation (add to Vendor primary sources if the lead prefers)

- [KiCad 9.0 documentation: Pcbnew (docs.kicad.org)](https://docs.kicad.org/9.0/en/pcbnew/pcbnew.html)
  The board editor: the design rules checker (copper clearance, minimum width, and that every pad is connected as the netlist says), the board setup dialog that holds the design rules, and the fabrication outputs and drill files. Verified as the KiCad 9.0 manual in this build. Use for: lesson 106.
- [Pico SDK 2.3.1 source, pico_divider/divider_hardware.S (GitHub)](https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2_common/pico_divider/divider_hardware.S)
  The SDK's __aeabi_idiv wrapper, which runs integer division on the RP2040 hardware divider in the SIO block. Use for: lesson 104 (why a divide by a power of two is still worth a shift on the Pico) and lesson 21.
