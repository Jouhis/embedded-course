# Proposals from the depth pass on lessons 0081 to 0085

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Testing and CI

**Unit under test**:
The module that one unit test exercises. Everything it depends on is either replaced by a test double or left out of the run.
_Avoid_: System under test (a larger scope, used when several modules run together)

**Dependency (unit test)**:
Something the unit under test calls that is not the subject of the test, such as a bus function or a timer. A test replaces it with a test double.
_Avoid_: Collaborator (a general object-oriented term)

**Runner (CI)**:
The machine that runs a CI job. A hosted runner starts clean for each job, so nothing from a developer's laptop is present.
_Avoid_: Agent (a different CI vendor's word), server (too vague)

**Workflow (CI)**:
A YAML file that tells the CI server when to run, and which jobs and steps to run. GitHub reads workflows only from the repository's .github/workflows folder.
_Avoid_: Pipeline (the whole run is the pipeline; the file is the workflow)

**Job (CI)**:
A list of steps that run together on one runner. Jobs run in parallel unless one lists another in needs.
_Avoid_: Step (a step is one action or command inside a job)

**Exit code**:
The number a program returns when it stops. Zero means success, and any other value means failure. A CI job passes or fails from exit codes, not from what the program printed.
_Avoid_: Return code (the same idea in some tools; the course says exit code)

## Robustness and diagnostics

**Log level**:
A rank of how important a log line is: error, warning, info, debug or trace. A build keeps the levels at or above its threshold and drops the rest.
_Avoid_: Severity (the word cppcheck uses for its finding categories)

**Deferred logging**:
Recording an entry in a buffer in the time-critical code, and printing the buffer later from the main loop. The slow output then runs where its delay does not matter.
_Avoid_: Asynchronous logging (a general term that often means threads)

**Precise fault**:
A fault whose stacked PC is the address of the instruction that caused it. The fault is reported before any later instruction runs.
_Avoid_: Imprecise fault (the stacked PC is then a later instruction)

**Orphan section**:
A section that the linker script does not name. The linker places it by its own rules, after the sections it knows. A production script names every section it needs.
_Avoid_: Unplaced section (the linker does place it)

## Resource proposals (RESOURCES.md format)

- [GitHub Docs: using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
  The page that says secrets are not passed to a workflow triggered from a forked repository (GITHUB_TOKEN is still passed). Use for: lesson 82, the simulate job's if line. Opened in this pass.
