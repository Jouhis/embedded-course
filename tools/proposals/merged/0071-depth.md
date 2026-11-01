# Proposals from the depth pass on lessons 0071 to 0073

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## STM32 and CMSIS

**Update event**:
The moment a timer's counter wraps at its limit, or is forced by software, when it reloads the preloaded PSC and ARR values and raises the update interrupt flag. A new prescaler or reload takes effect at the next update event.
_Avoid_: Overflow (the counter does not overflow, it wraps by design), period tick (informal)

**Output compare**:
A timer mode in which a channel changes its output pin when the counter reaches the channel's compare register. PWM is one output compare mode.
_Avoid_: Compare match (informal, and the term for the event rather than the mode)

**Capture/compare register (CCR)**:
The per-channel register that holds the compare value in output mode, and the copied counter value in input capture mode. The name is CCRx for channel x.
_Avoid_: Compare register (drops the capture half of the name)

**Reload value (LOAD)**:
The SysTick register that holds the count the counter reloads from. The period is LOAD + 1 cycles, so LOAD is one less than the number of ticks per period.
_Avoid_: Period (the register holds a count, not a time)

## Glossary proposals: usage notes

Existing entries used as written: Timer (hardware), Prescaler (PSC), Auto-reload value (ARR), Input capture, Encoder mode, NVIC priority grouping, Preemption, Sub-priority, Tail-chaining, Late arrival, SysTick, Wrap-safe timeout, HAL (hardware abstraction layer), Blocking (code), Volatile, Critical section, Tick. No change is proposed for them.

## Resource proposals (RESOURCES.md format)

None. The sources used in these lessons are already in RESOURCES.md: the Arm Cortex-M3 TRM (sections 5.3.2, 5.5, 5.6 and 5.7), CMSIS_5, the Wokwi part pages, and the ST reference manual and datasheet entries. The ST entries could not be opened in this session, so their section numbers remain unchecked (see the lesson source boxes).
