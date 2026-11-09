# Checkpoint 5: STM32 deep dive (lessons 66-75). Built by build_checkpoint.py.
# Each question: (lessons, prompt, [right, wrong, wrong, wrong], why). The right option is listed first.

GOAL = """You find out which of lessons 66 to 75 have stuck: the toolchain, startup and linker script, the
    HAL, interrupts, timers, the NVIC, SysTick, DMA and low power on the STM32. Then you know what to go
    over again before the firmware architecture lessons."""

SOURCES = """The facts come from <a href="https://www.st.com/resource/en/reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf" target="_blank" rel="noopener">RM0008</a>
    and the <a href="https://www.keil.com/dd/docs/datashts/arm/cortex_m3/r2p0/ddi0337g_cortex_m3_r2p0_trm.pdf" target="_blank" rel="noopener">Arm Cortex-M3 TRM</a>.
    Each lesson lists its own sources."""

QUESTIONS = [
    ([66],
     "In the STM32 device header, what is <code>USART_SR_TXE</code>?",
     ["A mask with the TXE bit set", "The address of the SR register",
      "A function that waits for TXE", "The bit number of TXE, 7"],
     "Names such as <code>USART_SR_TXE</code> are masks you AND or OR with the register. The bit number "
     "has its own name ending in <code>_Pos</code>."),
    ([66, 73],
     "A baud divisor is computed from the constant 72000000, but the board now runs at 8 MHz. What is the better habit?",
     ["Compute it from SystemCoreClock", "Keep a table of every clock rate",
      "Measure the baud rate at start-up", "Set the clock back to 72 MHz"],
     "<code>SystemCoreClock</code> holds the real core clock, so a value computed from it follows a clock "
     "change. A typed-in constant silently goes wrong."),
    ([66],
     "Which build output does a debugger or Wokwi load, with symbols for each function?",
     ["The ELF file", "The HEX file", "The map file", "The .o files"],
     "The ELF holds the code, the addresses and the symbols. <code>objcopy -O ihex</code> makes a HEX for "
     "plain loaders, without symbols."),
    ([67],
     "On the STM32F1, which register holds the configuration of pin PC13?",
     ["GPIOC-&gt;CRH", "GPIOC-&gt;CRL", "GPIOC-&gt;ODR", "GPIOC-&gt;IDR"],
     "Pins 0 to 7 are set in CRL and pins 8 to 15 in CRH, four bits per pin. PC13's field starts at bit "
     "(13 mod 8) × 4 = 20 of CRH."),
    ([67],
     "Why is the pin's field in CRH changed with a mask and a set, rather than one plain store?",
     ["A plain store would reset the other pins", "A plain store is not allowed on CRH",
      "The mask makes the write atomic", "The set bit enables the port clock"],
     "CRH configures eight pins. Clearing only the four bits of one field and then setting them keeps the "
     "other seven pins as they were."),
    ([67, 73],
     "Two LEDs must blink at 300 ms and 700 ms from one loop. What does the course use?",
     ["Deadlines on a millisecond tick count", "A blocking delay inside each branch",
      "Two separate timers, one per LED", "A delay of the smaller period, 300 ms"],
     "Each LED keeps its own deadline on a shared tick. The loop never blocks, so each LED changes at its "
     "own rate."),
    ([68],
     "On reset, what does a Cortex-M core read from word 0 of the vector table?",
     ["The initial stack pointer", "The reset handler address",
      "The size of the vector table", "The first instruction of main"],
     "Word 0 is loaded into MSP, and word 1 is the reset handler's address. Getting the order wrong is a "
     "classic first startup bug."),
    ([68],
     "An initialised global <code>int x = 5;</code> has two addresses. What does the reset handler do with them?",
     ["Copies the value from flash into RAM", "Copies the value from RAM into flash",
      "Writes 5 to RAM from a constant", "Nothing: x is read from flash"],
     "<code>.data</code> is stored in flash (its load address) and used in RAM (its run address). The "
     "startup copies it across, clears <code>.bss</code>, then calls <code>main</code>."),
    ([68],
     "Why does the linker script wrap the vector table section in <code>KEEP</code>?",
     ["So the linker does not discard it", "So it is copied to RAM at boot",
      "So it is aligned to 512 bytes", "So the debugger can find its symbols"],
     "Nothing in the code refers to the vector table, so with section garbage collection the linker would "
     "remove it. <code>KEEP</code> stops that."),
    ([69],
     "Where does generated CubeMX code keep your own edits safe across a regenerate?",
     ["Inside the USER CODE blocks", "Anywhere inside main.c",
      "In the Drivers/ folder", "At the end of each HAL file"],
     "CubeMX rewrites everything outside the <code>USER CODE BEGIN/END</code> blocks. Put larger code in "
     "your own files."),
    ([69],
     "How does a project replace <code>HAL_UART_RxCpltCallback</code>?",
     ["Define a function with that name", "Register it with HAL_UART_Init",
      "Edit the HAL source file", "Add it to the vector table"],
     "HAL callbacks are weak. A function with the same name in your own file overrides the empty default "
     "at link time."),
    ([69, 73],
     "Which test of a deadline is correct across the 32-bit tick wrap?",
     ["(int32_t)(now - deadline) &gt;= 0", "(uint32_t)now &gt;= (uint32_t)deadline",
      "(uint32_t)(now - deadline) &gt;= 0", "(uint32_t)(deadline - now) == 0"],
     "The subtraction in unsigned arithmetic, cast to signed, gives the right sign even when the counter "
     "has wrapped. A plain comparison fails at the wrap, and an unsigned result is never below 0."),
    ([70],
     "A USART receive interrupt is enabled in the peripheral, but the handler never runs. What else is needed?",
     ["Enable the IRQ and its priority in the NVIC", "Declare the handler as volatile",
      "Enable DMA on the receive channel", "Set the pin to push-pull output"],
     "An interrupt needs three things: the peripheral's enable bit, the NVIC enable with a priority, and a "
     "handler that clears the flag."),
    ([70],
     "A one-producer, one-consumer ring buffer on one core needs no lock. What order makes that true?",
     ["Write the slot, then publish the head", "Publish the head, then write the slot",
      "Disable interrupts for every read", "Read the tail inside the producer"],
     "The consumer only reads slots the head has published. If the slot is written first, the consumer "
     "never sees a slot before its data is in it."),
    ([70],
     "An EXTI interrupt fires again and again after one button press. What has the handler forgotten?",
     ["To write 1 to the pending bit", "To read the GPIO input register",
      "To disable the NVIC interrupt", "To write 0 to the pending bit"],
     "An EXTI pending bit is cleared by writing 1 to it. Left set, the interrupt is taken again as soon as "
     "the handler returns."),
    ([71],
     "A timer counts at f_clk ÷ (PSC + 1). With an 8 MHz clock and PSC = 7999, how fast does it count?",
     ["1 kHz", "1 MHz", "8 kHz", "1 Hz"],
     "8 000 000 ÷ 8000 = 1000 counts per second. Both PSC and ARR carry the plus one."),
    ([71],
     "In PWM mode 1 with ARR = 99, which CCR gives a 25 % duty cycle?",
     ["25", "24", "75", "99"],
     "The period is ARR + 1 = 100 ticks, and the output is high while CNT &lt; CCR, so CCR = 25 gives 25 "
     "high ticks."),
    ([71],
     "What does input capture do at a signal edge?",
     ["Copies the counter value into CCRx", "Resets the counter to zero",
      "Starts a DMA transfer of the pin", "Raises the prescaler by one"],
     "The hardware latches CNT into the capture register at the edge. The difference of two captures, in "
     "the counter's unsigned width, is the pulse width."),
    ([72],
     "Two interrupts have preemption priorities 2 and 5. Which one can interrupt the other?",
     ["Priority 2 can interrupt priority 5", "Priority 5 can interrupt priority 2",
      "Either can interrupt the other", "Neither: they queue up instead"],
     "A lower number is more urgent, and a handler is preempted only by a strictly lower preemption value."),
    ([72],
     "A new interrupt source is enabled without setting its priority. Why is that a trap?",
     ["Priority 0 is the reset value, the most urgent", "It gets the least urgent value, 15",
      "It is ignored until a priority is set", "It shares a priority with SysTick"],
     "Priorities reset to 0, the most urgent level, so an unconfigured source can preempt everything. Set "
     "every priority before enabling the source."),
    ([72],
     "Two interrupts are pending when a handler returns. How does the core start the next one quickly?",
     ["Tail-chaining, without a full unstack", "It re-runs the reset handler first",
      "It lets main run one instruction", "It pushes all registers once more"],
     "Tail-chaining skips the unstack and restack and starts the next handler after about 6 cycles instead "
     "of 12."),
    ([73],
     "A 1 kHz SysTick tick at 8 MHz needs which LOAD value?",
     ["7999", "8000", "8001", "799"],
     "The period is LOAD + 1 cycles, so 8000 cycles needs LOAD = 7999."),
    ([73],
     "<code>HAL_Delay(10)</code> is called inside an EXTI handler of higher priority than SysTick. What happens?",
     ["It hangs, as the tick can never advance", "It returns after exactly 10 ms",
      "It returns at once with an error", "It waits 10 ms, then resets"],
     "<code>HAL_Delay</code> waits on a tick that SysTick advances. While the higher-priority handler runs, "
     "SysTick cannot preempt it, so the count never moves."),
    ([73, 69],
     "A 32-bit millisecond counter wraps after about 49.7 days. What keeps timeouts correct at the wrap?",
     ["Subtract the start time in unsigned arithmetic", "Reset the counter every 24 hours",
      "Use a 64-bit counter in every handler", "Compare absolute times with &gt;="],
     "<code>now - start</code> in <code>uint32_t</code> wraps too, so the elapsed time comes out right. "
     "Comparing absolute times fails once."),
    ([74],
     "UART receive uses DMA in circular mode with half-transfer and complete interrupts. What do the interrupts say?",
     ["Which half of the buffer is safe to read", "That the DMA has stopped for good",
      "That a byte was lost on the line", "That the UART baud rate has changed"],
     "Circular mode keeps filling. At half-transfer the first half is full and safe to read while the DMA "
     "fills the second, and the other way at complete."),
    ([74],
     "A DMA transfer into an array writes every byte to the array's first element. Which bit was not set?",
     ["MINC, memory increment", "CIRC, circular mode",
      "EN, the channel enable", "TCIE, complete interrupt"],
     "Without MINC the memory address stays put, so each transfer overwrites the same element."),
    ([74],
     "In which order is a DMA channel set up?",
     ["Addresses and count first, EN last", "EN first, then the addresses",
      "The count after EN, then CCR", "Any order, as all load together"],
     "The channel starts as soon as EN is set, so the addresses, the count and the control bits must be "
     "written before it."),
    ([75],
     "A device must keep its SRAM while it sleeps for a minute and wake on a button. Which mode fits best?",
     ["Stop mode, woken by EXTI", "Standby, woken by EXTI",
      "Sleep mode, woken by SysTick", "Stop mode, woken by TIM2"],
     "Stop keeps SRAM and wakes on an EXTI line. Standby loses SRAM, and a timer's clock stops in Stop, so "
     "it cannot wake the chip."),
    ([75],
     "A sensor wakes for 10 ms every second. Which change usually saves the most battery?",
     ["Shortening the awake time", "Using a smaller sleep current",
      "Running the CPU at a lower clock", "Removing the power LED's resistor"],
     "The average is d × Ia + (1 − d) × Is, and the awake current is far larger, so shortening the awake "
     "time usually wins. Measure to be sure."),
    ([75, 66],
     "Measured sleep current is ten times the datasheet figure. What is a likely cause?",
     ["A peripheral clock was left on", "The WFI instruction was not used",
      "The SysTick priority is too low", "SRAM was kept powered in Stop"],
     "A stray peripheral clock or a floating input can cost more than the whole sleep budget. Turn off what "
     "you do not use before you sleep."),
]
