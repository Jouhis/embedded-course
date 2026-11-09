# Checkpoint 8: Communication, storage and security (lessons 100-106). Built by build_checkpoint.py.
# Each question: (lessons, prompt, [right, wrong, wrong, wrong], why). The right option is listed first.

GOAL = """You find out which of lessons 100 to 106 have stuck: how the buses decide who talks and how a
    receiver checks a message, how a bootloader and a flash log survive a power cut, and how a device
    is protected. Then you know what to go over again before the signal-processing lessons."""

SOURCES = """The facts come from <a href="https://www.ti.com/lit/an/sloa101b/sloa101b.pdf" target="_blank" rel="noopener">TI SLOA101</a>
    for CAN and <a href="https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf" target="_blank" rel="noopener">the RP2350 datasheet</a>,
    section 10, for secure boot. Each lesson lists its own sources."""


QUESTIONS = [
    ([100],
     "Two CAN nodes start sending at the same moment, one with identifier 0x120 and one with 0x0F5. What happens?",
     ["0x0F5 wins; the other node retries later", "0x120 wins as the higher identifier",
      "Both frames collide and both are lost", "Both send and receivers pick one"],
     "Arbitration compares the identifiers bit by bit. A dominant 0 overwrites a recessive 1, so the lower "
     "identifier wins, and the loser stops sending without damaging the winner's frame."),
    ([100],
     "Why does a CAN transmitter insert an extra bit after five identical bits?",
     ["To keep the receivers' clocks in step", "To mark the end of the identifier field",
      "To add a parity check on every byte", "To give the other nodes a turn to talk"],
     "A long run of equal bits has no edges to resynchronise on. The stuff bit adds an edge; receivers "
     "remove it, and a sixth identical bit is reported as a stuff error."),
    ([100, 101],
     "A new CAN or RS-485 bus shows ringing and random errors. Which fix is checked first?",
     ["A 120 Ω terminator at each end of the bus", "A pull-up resistor on each data line",
      "A faster baud rate on every node", "A 120 Ω resistor at every node"],
     "Both buses are differential pairs that need a 120 Ω terminator at each end, and only at the ends. "
     "Missing terminators give reflections; one at every node loads the bus too much."),
    ([101],
     "A Modbus RTU frame has no start or end byte. How does a slave know a frame has ended?",
     ["A silence of 3.5 character times", "A 0x00 byte after the CRC field",
      "The byte count in the first byte", "A line break sent by the master"],
     "RTU frames are separated by time: a gap of 3.5 character times, fixed at 1.750 ms above 19200 baud, "
     "ends the frame."),
    ([101],
     "A master sends a request with a corrupted CRC. What does the slave send back?",
     ["Nothing, so the master times out", "An exception with code 03",
      "An echo of the damaged request", "A NACK frame with the right CRC"],
     "A slave ignores a frame with a bad CRC or another slave's address. The master must time out and retry; "
     "exceptions are only sent for frames that arrived intact."),
    ([101],
     "A reply's function code is 0x83 instead of 0x03. What does it mean?",
     ["It is an exception reply to a read", "It is a read of 0x83 holding registers",
      "It is a write request echoed back", "The slave is busy and asks to wait"],
     "An exception sets the high bit of the function code, so 0x03 becomes 0x83, and an exception code "
     "follows, such as 02 for an illegal address."),
    ([102],
     "A USB device has a reading ready. How does it get to the host?",
     ["It waits until the host polls the endpoint", "It starts a transfer to the host itself",
      "It raises an interrupt line to the host", "It writes the reading to endpoint 0"],
     "The host starts every USB transfer. A device queues data on an interrupt or bulk endpoint, and the "
     "host collects it when it polls."),
    ([102],
     "A file copy to a USB stick is slow when the bus is busy but never corrupts. Which transfer type is that?",
     ["Bulk transfers", "Isochronous transfers", "Interrupt transfers", "Control transfers"],
     "Bulk transfers are error-corrected and retried, but get only the bandwidth left over, with no latency "
     "promise. Isochronous has guaranteed bandwidth but no retry."),
    ([102],
     "What does the host do first when a new USB device is plugged in?",
     ["Read its device descriptor at address 0", "Send data to its bulk endpoints",
      "Ask it for its CDC serial settings", "Select a configuration for it"],
     "Enumeration starts with control transfers on endpoint 0 at address 0: the device descriptor, then "
     "SET_ADDRESS, then the configuration descriptors and SET_CONFIGURATION."),
    ([103],
     "Why does the course's protocol COBS-encode each frame before sending it on the UART?",
     ["So 0x00 can mark every frame end", "So the frame gets shorter on the wire",
      "So bit errors can be corrected", "So frames arrive in the right order"],
     "COBS removes every zero from the body, so a 0x00 can only be a frame end. A receiver that joins "
     "mid-stream resynchronises at the next zero."),
    ([103],
     "You have written a CRC-16 function. What do you check before building frame code on it?",
     ["Its result for \"123456789\" against the check value", "That it returns 0 for an empty buffer",
      "That two runs on the same data agree", "That it runs in under one millisecond"],
     "Every CRC variant has a published check value for the ASCII string 123456789, 0x29B1 for "
     "CRC-16/CCITT-FALSE. A wrong initial value or reflection shows up at once."),
    ([103, 101],
     "A CRC check passes on every frame, but now and then a whole command never arrives. What handles that?",
     ["Sequence numbers, an ACK and a timeout", "A longer CRC, such as a 32-bit one",
      "COBS encoding of every command frame", "Sending each byte twice on the wire"],
     "A CRC detects damage inside a frame that arrived. A lost frame needs sequence numbers, "
     "acknowledgements and a timeout with a retry."),
    ([104],
     "Before a bootloader jumps to an application, which of these does it check?",
     ["The stack pointer in word 0 points into RAM", "The application was built with -O2",
      "The UART has finished its last byte", "The application is the newest on disk"],
     "It checks the header magic, the image end, that word 0, the initial stack pointer, lies in RAM, and "
     "that the reset handler is a Thumb address inside the slot."),
    ([104],
     "In the hand-over, why does the bootloader set VTOR before branching to the application?",
     ["So interrupts use the application's table", "So the stack is moved into the slot",
      "So the flash is unlocked for writes", "So the reset handler can be found"],
     "VTOR tells the core where the vector table is. Without it, the first interrupt in the application "
     "would run the bootloader's handler."),
    ([104, 105],
     "An update is written into the second slot when the power fails. What should happen at the next boot?",
     ["The old image still runs from its slot", "The device stays in the bootloader",
      "The half-written image is run anyway", "Both slots are erased and rewritten"],
     "With two slots, the old image is never erased until the new one has proven itself. A torn write fails "
     "validation, and the bootloader runs the known-good image."),
    ([105],
     "A byte in NOR flash holds 0xF0. You program 0x0F over it without an erase. What does it read?",
     ["0x00", "0x0F", "0xFF", "0xF0"],
     "Programming can only clear bits, so the result is the AND of the old and new values: 0xF0 AND 0x0F is "
     "0x00. Only an erase sets bits back to 1."),
    ([105],
     "Settings are saved to one flash location once a minute. What is the problem?",
     ["That sector wears out within months", "Flash loses data when it is not read",
      "The writes slow down the CPU clock", "Each save needs a full chip erase"],
     "At 100,000 erase cycles, one save a minute wears the sector out in about 69 days. A log of records "
     "spreads the writes over many slots."),
    ([105],
     "A record in the flash log was torn by a power cut. How does the store know at the next boot?",
     ["Its CRC fails, so the previous record loads", "Its sequence number is set to 0xFFFF",
      "The flash marks torn pages as bad", "The bootloader erases it on reset"],
     "Each record carries a CRC. A torn record fails it, so the store loads the newest good record, and the "
     "next save skips the torn slot."),
    ([106],
     "Firmware updates carry a CRC-32. Why does this not stop an attacker sending their own firmware?",
     ["Anyone can compute a CRC; it has no secret", "A CRC-32 can be reversed to the image",
      "The CRC is checked only after flashing", "CRCs only detect single bit errors"],
     "A CRC detects accidental damage, but the attacker simply computes the right CRC for their image. "
     "Authenticity needs a signature, made with a private key the device never holds."),
    ([106],
     "In secure boot, what makes the first check trustworthy?",
     ["A root of trust fixed in silicon", "A CRC stored next to the image",
      "A password typed in at the factory", "The application checking itself"],
     "The chain starts in code that cannot be changed, such as the RP2350 bootrom with a key fingerprint "
     "in OTP. Each stage then checks the next."),
    ([106, 104],
     "A glitch on the supply can make the CPU skip one instruction. How should the signature check respond?",
     ["Check it twice, or use a hardware detector", "Move the check into the application",
      "Replace the signature with a CRC-32", "Run the check at a higher clock rate"],
     "Fault injection can skip one branch. Redundant checks, such as testing the result twice in different "
     "ways, or a glitch detector make a single skip insufficient."),
]
