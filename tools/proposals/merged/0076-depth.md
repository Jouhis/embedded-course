# Proposals from the depth pass on lessons 0076 to 0080

Written by the author of lessons 0076 to 0080 (depth standard, LESSON-SPEC section 17). The lead merges these into `GLOSSARY.md` and `RESOURCES.md`. Nothing here has been merged.

## Glossary additions

Format follows `GLOSSARY.md`: bold term, one or two sentences, `_Avoid_:` line where useful. Group in brackets after each term.

**Translation unit** (Computer architecture, software):
One .c file with every header it includes, compiled to one object file. The compiler checks each translation unit separately.
_Avoid_: Compilation unit (acceptable in C standards texts)

**Symbol (linker)**:
A global name, such as a function or a global variable, as the linker sees it. The linker binds each use of a symbol to one definition, and reports an error when two definitions share a name.
_Avoid_: Identifier (the C-language term, which is broader)

**Fragmentation (heap)**:
The state in which free memory is split into blocks, none of them large enough for a request, even though the total free space is large. Caused by allocating and freeing blocks of different sizes.
_Avoid_: Heap damage (a different fault: a write outside a block)

**Dispatcher**:
The loop that takes events from queues and calls the handler of the object that owns each queue, one event at a time.
_Avoid_: Scheduler (which decides when threads run; see RTOS)

**Subscription mask**:
A bit mask in which bit n is set when an active object wants signal n. The publisher compares the mask with each event's bit.
_Avoid_: Filter (informal)

**Fixture (test)**:
The state a unit test needs before it runs, set up in setUp() and cleared in tearDown(), so that each test starts from the same state.
_Avoid_: Setup state (informal)

**Assert (test)**:
A check in a unit test that stops the test with a message when a value is wrong. Unity's assert macros are typed, such as TEST_ASSERT_EQUAL_UINT8.
_Avoid_: Assertion (firmware) (that is a runtime check in the product, a different use)

**Red, green, refactor**:
The three steps of test-driven development: write a test and see it fail, write the simplest code that passes, then clean the code with the tests still passing.
_Avoid_: Red-green (omits the refactor step)

**Commit (git)**:
A named snapshot of the tracked files, with its message and a link to its parent commits. Each commit is identified by a hash of its contents.
_Avoid_: Save (informal)

**Branch (git)**:
A name that points at one commit. A commit on the branch moves the name forward.
_Avoid_: Copy of the code (a branch shares its history until it diverges)

**Fast-forward merge**:
A merge in which the target branch is simply behind the source, so Git moves the target's name and creates no merge commit. `--no-ff` forces a merge commit.
_Avoid_: Rebase (a different operation that rewrites commits)

**Revert (git)**:
A new commit that undoes the changes of an earlier commit, without rewriting history.
_Avoid_: Reset (which moves the branch name, and can discard work)

**Code review**:
A second person reads a proposed change before it reaches the main line, and comments on the lines that need work.
_Avoid_: Pull request (the hosted-tool name for the same step)

**Pull request**:
A hosted-tool request to merge a branch, which carries the diff, the discussion and the review. GitHub's term; GitLab calls it a merge request.
_Avoid_: Merge request (acceptable in GitLab contexts)

## Resources additions

Format follows `RESOURCES.md`: bold-free list item with a link, then one descriptive line with "Use for:".

- [Doxygen manual: usage (doxygen.nl)](https://www.doxygen.nl/manual/doxygen_usage.html)
  The command-line options of doxygen, including -g, which writes a template configuration file, and the rule that a run without a configuration argument looks for a file named Doxyfile. Use for: lesson 0079.

## Notes for the lead

- Lesson 0078's memory-map diagram was kept as corrected. The text says the diagram is a schematic: on the Pico's default layout the core 0 stack is in SCRATCH_Y, not in main RAM.
- Lesson 0078's expected Debug-build numbers (high-water 440 bytes, CANARY HIT) come from the disassembly and the crt0 call sequence, not from a simulator run, because no WOKWI_CLI_TOKEN is set. The lesson says so.
