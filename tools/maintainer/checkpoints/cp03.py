# Checkpoint 3: Embedded C (lessons 45-50). Built by tools/maintainer/build_checkpoint.py.
# Each question: (lessons, prompt, [right, wrong, wrong, wrong], why). The right option is listed first.

GOAL = """You find out which of lessons 45 to 50 have stuck and which to go over again before the
    peripheral lessons, where every driver uses these rules on real registers."""

SOURCES = """The facts come from <a href="https://en.cppreference.com/w/c/language/conversion" target="_blank" rel="noopener">cppreference, implicit conversions</a>
    and <a href="https://en.cppreference.com/w/c/language/volatile" target="_blank" rel="noopener">volatile</a>, and
    <a href="https://www.st.com/resource/en/reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf" target="_blank" rel="noopener">RM0008</a>
    for the GPIO registers. Each lesson lists its own sources."""

QUESTIONS = [
    ([45],
     "<code>uint8_t a = 200, b = 100;</code> then <code>int s = a + b;</code>. What is <code>s</code>?",
     ["300", "44", "255", "0"],
     "Both operands are promoted to <code>int</code> before the addition, so the sum is 300. The wrap to 44 "
     "happens only if the result is stored back into a <code>uint8_t</code>."),
    ([45],
     "A loop is written <code>for (uint8_t i = 0; i &lt; 300; i++)</code>. What does it do?",
     ["Runs forever: i wraps after 255", "Runs 300 times, then stops", "Runs 256 times, then stops",
      "Fails to compile: 300 is too big"],
     "A <code>uint8_t</code> holds 0 to 255, so <code>i</code> wraps to 0 before it can reach 300 and the "
     "condition is always true. A <code>uint16_t</code> counter would reach 300."),
    ([45],
     "<code>int n = -1; unsigned int u = 1;</code> Which is true about <code>n &lt; u</code>?",
     ["It is false: n becomes a huge unsigned", "It is true, as -1 is less than 1",
      "It is undefined behaviour in C", "It does not compile without a cast"],
     "When a signed and an unsigned operand of the same size meet, the signed one is converted to unsigned. "
     "-1 becomes 0xFFFFFFFF, which is not less than 1. Compilers warn about this with -Wsign-compare."),
    ([45],
     "A reviewer sees <code>if (x + 1 &lt; x) { /* overflow */ }</code> with <code>int x</code>. Why is this check unreliable?",
     ["Signed overflow is undefined, so it may be removed",
      "The comparison is always true for negative x",
      "The int promotion makes x + 1 a long value",
      "It only works when x is declared volatile"],
     "Signed overflow is undefined behaviour, so the optimiser may assume <code>x + 1</code> never overflows "
     "and delete the branch. Test before adding: <code>if (x &gt; INT_MAX - 1)</code>."),
    ([46],
     "A loop <code>while (!flag) {}</code> waits for a flag set in an ISR. It works at -O0 and hangs at -O2. What is missing?",
     ["volatile on the flag", "static on the flag", "const on the flag", "A longer stack"],
     "Without <code>volatile</code> the optimiser may load the flag once and loop on the copy in a register. "
     "<code>volatile</code> makes every read a real load from memory."),
    ([46],
     "<code>volatile uint32_t count;</code> is incremented in an ISR and in <code>main</code>. Now and then a count is lost. Why?",
     ["count++ is load, add, store, and can be split",
      "volatile stops the ISR from seeing the value",
      "The ISR runs on a different copy of count",
      "A uint32_t cannot be written in one store"],
     "<code>volatile</code> forces real accesses but does not make the read-modify-write atomic. An interrupt "
     "between the load and the store loses one increment; a critical section (lesson 57) fixes it."),
    ([46],
     "A 1 KB lookup table is declared <code>static const uint8_t table[1024] = {...};</code>. Where does it live on the course's STM32?",
     ["In flash only, using no RAM", "In RAM, copied from flash at boot",
      "On the stack of each caller", "In flash and in RAM, twice"],
     "<code>const</code> data goes in <code>.rodata</code>, which the linker script places in flash. A "
     "non-const initialised array would go in <code>.data</code> and cost RAM as well as flash."),
    ([46],
     "Inside a function, <code>static int calls = 0; calls++;</code>. What does <code>calls</code> hold on the third call, after the increment?",
     ["3", "1", "0", "2"],
     "A static local is initialised once, before <code>main</code>, and keeps its value between calls. It is "
     "not reset to 0 on each call the way an ordinary local would be."),
    ([47],
     "The Blue Pill LED on PC13 lights when the pin is low. Which single store lights it without touching other pins of port C?",
     ["<code>GPIOC-&gt;BSRR = 1u &lt;&lt; 29;</code>", "<code>GPIOC-&gt;BSRR = 1u &lt;&lt; 13;</code>",
      "<code>GPIOC-&gt;ODR &amp;= ~(1u &lt;&lt; 13);</code>", "<code>GPIOC-&gt;ODR = 1u &lt;&lt; 13;</code>"],
     "BSRR resets pin n with bit n + 16, so bit 29 drives PC13 low and lights the active-low LED. Bit 13 would "
     "set the pin high. The <code>&amp;=</code> on ODR lights it too, but as a load, a change and a store, which "
     "can undo a change an interrupt made to another pin in between."),
    ([47],
     "A first program writes GPIOC registers, but nothing changes and they read back as zero. What was most likely skipped?",
     ["Enabling the port's clock in RCC", "Declaring the registers volatile",
      "Calling the SysTick setup first", "Setting the pin in the BSRR first"],
     "A peripheral with its clock gated off ignores writes and reads as zero. Enable the port's bit in "
     "<code>RCC-&gt;APB2ENR</code> before the first access."),
    ([47, 46],
     "Why are the members of the vendor's <code>GPIO_TypeDef</code> declared <code>__IO</code>?",
     ["So every access really reaches the hardware", "So the struct is placed in flash memory",
      "So that the members are padded to 4 bytes", "So only an ISR is allowed to write them"],
     "<code>__IO</code> is <code>volatile</code>. Without it, the compiler could merge two writes or reuse an "
     "old read, and a register that changes on its own would look frozen."),
    ([48, 45],
     "A sensor sends a 16-bit value big-endian: 0x12 then 0x34. Which line gives 0x1234 on any CPU?",
     ["<code>(uint16_t)((hi &lt;&lt; 8) | lo)</code>", "<code>memcpy(&amp;v, buf, sizeof v)</code>",
      "<code>*(const uint16_t *)buf</code>", "<code>(uint16_t)((lo &lt;&lt; 8) | hi)</code>"],
     "Shifts and OR build the number arithmetically, so the CPU's byte order does not matter. A copy or a "
     "pointer cast takes the bytes in host order, which on a little-endian Cortex-M gives 0x3412."),
    ([48],
     "Why does the course avoid C bit-fields for a register map?",
     ["Their bit layout is implementation-defined", "They cannot be declared volatile at all",
      "They always use more RAM than a mask", "They only work with signed integer types"],
     "The order and packing of bit-fields are left to the compiler, so the field may not land on the bits the "
     "reference manual names. A fixed-width integer with named masks and shifts is exact."),
    ([48],
     "A frame is described with a packed struct. What does packing change?",
     ["It removes padding between members", "It converts the byte order to big-endian",
      "It makes unaligned access always safe", "It makes the struct members volatile"],
     "Packing fixes the member offsets by removing padding. It does not touch byte order, and an unaligned "
     "access through a packed member can still be slow or fault on some cores."),
    ([49, 46],
     "A dispatcher calls <code>handlers[ev]()</code> from a file-scope table. An event with no registered handler crashes the board. Why?",
     ["The empty slot is NULL, so the call jumps to 0", "Function pointers lose their value at -O2",
      "The table lives in flash and cannot be read", "A callback can only run from an interrupt"],
     "Static objects are zero-initialised, so an unregistered slot is NULL. Calling it branches to address 0. "
     "Check the slot before the call, and count events that have no handler."),
    ([49],
     "An interrupt handler is written as <code>void usart1_irqhandler(void)</code>. The interrupt fires and the board hangs. What happened?",
     ["The name does not match, so Default_Handler ran", "The ISR returned a value the core ignored",
      "The function pointer was declared without const", "Interrupts need the handler to be static"],
     "The vector table refers to <code>USART1_IRQHandler</code>, which is a weak alias of "
     "<code>Default_Handler</code>, an infinite loop. Only a function with the exact name replaces it."),
    ([50],
     "<code>#define SQUARE(x) x * x</code>. What is <code>SQUARE(2 + 1)</code>?",
     ["5", "9", "6", "7"],
     "The macro pastes text: <code>2 + 1 * 2 + 1</code>, which is 5. Use a <code>static inline</code> "
     "function for computation; it evaluates its argument first."),
    ([50, 49],
     "An enum of events and a table of their names keep drifting apart in reviews. What keeps them in step?",
     ["An X-macro that generates both from one list", "A static inline function per event name",
      "Include guards around the header with them", "A function pointer table for the names"],
     "An X-macro holds one list and expands it twice, once into the enum and once into the string table, so "
     "adding an event updates both."),
    ([50],
     "A header is included by two .c files and twice in one of them. The second include in the same file gives \"redefinition\" errors. What fixes it?",
     ["An include guard around the header", "Making every function in it static",
      "Building with -O2 instead of -O0", "Renaming the header to end in .hpp"],
     "An include guard, <code>#ifndef X_H / #define X_H / #endif</code>, makes the preprocessor skip the "
     "header the second time in the same translation unit. Each .c file still gets its own copy."),
]
