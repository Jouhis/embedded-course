# Proposals from the depth pass on lessons 0095, 0096, 0097 and lab06

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.
Anchors used in the lessons: `logging` and `shell-zephyr` (both linked from 0097).

## Glossary proposals (GLOSSARY.md format)

## Firmware and tools

**Logging**:
Emitting text lines on purpose, each with a level and a module name, so a running device reports what it did. Zephyr filters by level per module and sends the output to a backend such as UART or the shell.
_Avoid_: printf debugging (for the disciplined form with levels), trace (which records events, not text)

**Shell (Zephyr)**:
A command line inside the firmware that reads text from a serial port, splits it into a command and arguments, and calls a handler written for that command. It runs in its own thread.
_Avoid_: Console (which is the output device), REPL (a general term for an interpreter prompt)

**Log level**:
The severity of one log message (ERR, WRN, INF or DBG in Zephyr), numbered so that a lower number is more serious. A message prints when its level is at most the level of its module.
_Avoid_: Verbosity (which hides the ordering)

**Active low**:
A pin or flag convention in which the active state is the low physical level. In Zephyr the `GPIO_ACTIVE_LOW` flag makes the logical value 1 when a button wired to ground is pressed.
_Avoid_: Inverted (which hides which state is the active one)

## RTOS

**Cooperative thread**:
A Zephyr thread with a negative priority. Once it runs, a preemptible thread cannot take the CPU from it, and it keeps the CPU until it blocks or yields.
_Avoid_: Non-preemptive task (FreeRTOS has no equivalent priority class)

**Preemptible thread**:
A Zephyr thread with a non-negative priority. A ready thread of higher or equal urgency can interrupt it at any time.
_Avoid_: Preemptive task (the Zephyr term is about the priority class, not the task)

**Priority inheritance**:
The rule that a mutex owner's priority is raised while a more urgent thread waits for that mutex, so a middle-priority thread cannot delay the owner. Zephyr mutexes and FreeRTOS mutexes both implement it.
_Avoid_: Priority boosting (a common name for the same rule, but less exact)

**Interrupt context**:
The state of the CPU while an interrupt handler or a timer expiry function runs. Code there may not block, wait on a mutex or sleep, and must finish quickly.
_Avoid_: ISR context (which names only the hardware handler, not the expiry function)

**System workqueue**:
Zephyr's built-in thread that runs work items submitted from interrupts or threads, in order. A work item is a small structure with a handler function.
_Avoid_: Deferred task (a general pattern, not the Zephyr object)

## Embedded C

_(no additions)_

## Peripherals

**Start gate**: already in GLOSSARY.md (lab 6); no change proposed.

## Resources proposals (RESOURCES.md format)

- [Zephyr: Twister (test runner)](https://docs.zephyrproject.org/4.5.0/develop/twister/index.html)
  How Twister finds test description files, the platform and harness options, and the native_sim Linux requirement. Use for: lesson 97.
