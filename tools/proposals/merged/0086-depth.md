# Proposals from the depth expansion of lessons 0086 to 0090

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files.

## Glossary terms (add to the group shown)

### RTOS (group: RTOS)

**Deadlock**:
A cycle of waiting in which each task holds a resource that another task in the cycle needs, so none of them can proceed. A timeout does not break it; a lock order prevents it.
_Avoid_: Hang (a hang can have other causes, such as a stuck peripheral)

**Priority inheritance**:
The rule that while a high-priority task waits on a mutex, the owner runs at the waiter's priority, and gets its own priority back when it gives the mutex. FreeRTOS does this for mutexes, not for binary semaphores.
_Avoid_: Priority boost (informal)

**Lock ordering**:
A rule that every task takes a set of locks in one fixed global order, so that no cycle of waiting can form.
_Avoid_: Lock hierarchy (acceptable in some texts)

**Recursive mutex**:
A mutex that its owner may take again without blocking, and that is released after the same number of gives. A plain FreeRTOS mutex is not recursive.
_Avoid_: Reentrant lock (acceptable synonym)

**Ready list**:
The kernel's list of ready tasks, one list for each priority level. The scheduler takes the next task from the highest-priority list that is not empty.
_Avoid_: Run queue (informal)

**Time slicing**:
With `configUSE_TIME_SLICING` set to 1, tasks of equal priority take turns at each tick. Tasks of different priorities never share the core this way.
_Avoid_: Round robin (acceptable in conversation)

## Resources additions

Format follows `RESOURCES.md`: a list item with a link, then one descriptive line with "Use for:".

- [RISKS Digest 19.49: Mike Jones, "What really happened on Mars Rover Pathfinder" (catless.ncl.ac.uk, December 1997)](https://catless.ncl.ac.uk/Risks/19/49)
  The primary account of the Pathfinder resets: a VxWorks mutex created with priority inheritance off, and the flag changed from FALSE to TRUE by an uploaded C program. Use for: lesson 0090, the historical case. It is a report of a talk, so quote it as Jones's account.
- [RISKS Digest 19.50: reply by Bob Rahe, "Mars Pathfinder priority inversion" (catless.ncl.ac.uk, December 1997)](https://catless.ncl.ac.uk/Risks/19/50)
  A reply that dates the CMU priority inheritance paper to 1990 and notes earlier prior art in a mainframe locking scheme. Use for: lesson 0090, the note on prior art. The date is the replier's, not independently checked.

## Notes for the lead

- Lesson 0086 was corrected to Lab 4's own arithmetic: a full OLED update is 1112 bytes (1080 payload and 32 address bytes), about 100 ms at 100 kHz with 9 bit times per byte. The earlier 1025-byte and 90 ms figures did not match Lab 4.
- Lesson 0089 said the solution prints `QUEUE OK` about 600 ms after start. The code sends items at 0, 200 and 400 ms, so the line appears about 400 ms after start. The lesson now says 400 ms.
- The known FreeRTOS-on-STM32 issue in Wokwi is now stated in a note in lessons 0087, 0089 and 0090, where the lessons promise simulator output.
- DDI0337G section 5.5.1 (the stacked frame) and Table 8-18 on page 8-29 (the system handler priority registers) were checked against a local copy of the Keil-hosted PDF. The EXC_RETURN values are not in that text; lesson 0088 takes them from `assets/cpusim.js` and `port.c` line 239.
