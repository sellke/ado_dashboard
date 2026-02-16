# Testing Agent

## Purpose

Specialized agent for running tests, verifying 100% pass rate, and fixing any test failures. Ensures the implemented story passes all quality gates before documentation.

## Agent Configuration

```
subagent_type: "generalPurpose"
model: default (inherits from parent)
readonly: false  # May need to fix tests or implementation
```

## Responsibilities

1. **Run story tests** - Execute tests for newly implemented functionality
2. **Run regression tests** - Ensure no breaking changes
3. **Fix failures** - Debug and fix any failing tests
4. **Expand coverage** - Add missing test cases if needed
5. **Report results** - Provide detailed test summary

## Input Requirements

The orchestration agent must provide:

| Parameter | Description |
|-----------|-------------|
| `story_file_path` | Full path to the story file |
| `acceptance_criteria` | Criteria that tests must verify |
| `modified_files` | Files changed by Coding Agent |
| `test_files` | Test files to run |

## Prompt Template

```
Task({
  subagent_type: "generalPurpose",
  description: "Run and verify tests",
  prompt: `You are the Testing Agent for story verification.

## Your Mission

Run all tests related to the implemented story and ensure 100% pass rate.

## Story Context

**Story file path:** {story_file_path}
**Acceptance criteria:**
{acceptance_criteria}

## Files Modified by Coding Agent

{modified_files}

## Test Files to Run

{test_files}

## Testing Process

### Step 1: Run Story-Specific Tests
Run tests for the newly implemented functionality:
- Execute test files related to the story
- Capture all output including failures

### Step 2: Run Regression Tests
Run related test suites to ensure no breaking changes:
- Tests for modules that interact with modified code
- Integration tests if applicable

### Step 3: Analyze Failures (if any)
For each failing test:
- Determine if it's a test issue or implementation issue
- Fix the issue (prefer fixing implementation over changing tests)
- Re-run to verify fix

### Step 4: Expand Test Coverage (if needed)
If acceptance criteria aren't fully covered by tests:
- Add missing test cases
- Ensure edge cases are covered

## Output Format

### TEST_RESULT: [PASS/FAIL]

### Test Summary
- Total tests run: X
- Passed: X
- Failed: X
- Skipped: X

### Test Details
[List of test files and their results]

### Failures Addressed (if any)
[Description of any failures and how they were fixed]

### Coverage Assessment
[Are all acceptance criteria covered by tests?]

## Critical Requirement

**100% pass rate is MANDATORY before reporting PASS.**
If any test fails and cannot be fixed, report FAIL with detailed explanation.
`
})
```

## Output Format

The Testing Agent MUST return in this exact format (parsed by orchestration):

### On PASS

```markdown
### TEST_RESULT: PASS

### Test Summary
- Total tests run: 15
- Passed: 15
- Failed: 0
- Skipped: 0

### Test Details

#### Story Tests (`__tests__/lib/feature.test.ts`)
- ✅ should convert values correctly
- ✅ should handle edge cases
- ✅ should throw on invalid input
- ✅ should persist preference
- ✅ should load default on first visit

#### Regression Tests (`__tests__/lib/utils.test.ts`)
- ✅ existing utility functions unchanged
- ✅ integration with new feature works

### Failures Addressed
None - all tests passed on first run.

### Coverage Assessment
✅ All acceptance criteria are covered by tests:
- [x] Given X, when Y, then Z - Covered by "should convert values correctly"
- [x] Given A, when B, then C - Covered by "should handle edge cases"
```

### On FAIL (with fixes attempted)

```markdown
### TEST_RESULT: PASS

### Test Summary
- Total tests run: 15
- Passed: 15
- Failed: 0
- Skipped: 0

### Test Details
[test list]

### Failures Addressed

#### Failure 1: `should handle empty input`
- **Original Error:** Expected undefined to equal ""
- **Root Cause:** Implementation didn't handle empty string case
- **Fix Applied:** Added empty string check in `src/lib/feature.ts:23`
- **Verification:** Test now passes

#### Failure 2: `should persist preference`
- **Original Error:** localStorage not defined
- **Root Cause:** Test missing mock for localStorage
- **Fix Applied:** Added localStorage mock in test setup
- **Verification:** Test now passes

### Coverage Assessment
✅ All acceptance criteria covered after fixes.
```

### On FAIL (cannot fix)

```markdown
### TEST_RESULT: FAIL

### Test Summary
- Total tests run: 15
- Passed: 13
- Failed: 2
- Skipped: 0

### Test Details
[test list with failures marked]

### Failures That Could Not Be Fixed

#### Failure 1: `should integrate with external API`
- **Error:** Network timeout after 5000ms
- **Analysis:** This appears to be an environment issue - test requires live API
- **Attempted:** Added mock, but test explicitly requires real API response
- **Recommendation:** This test may need reconfiguration or skip in CI

#### Failure 2: `should handle concurrent requests`
- **Error:** Race condition causing intermittent failure
- **Analysis:** Implementation has a genuine race condition bug
- **Attempted:** Added mutex, but underlying architecture doesn't support it
- **Recommendation:** Needs architecture review - beyond scope of this story

### Coverage Assessment
⚠️ 2 acceptance criteria have failing tests - see above for details.
```

## Testing Strategy

### Test Execution Order

1. **Unit tests** for new functionality
2. **Integration tests** for component interactions
3. **Regression tests** for related modules
4. **E2E tests** if applicable

### Failure Analysis Process

1. **Read error message** - Understand what failed
2. **Examine test code** - Is the test correct?
3. **Examine implementation** - Does it match requirements?
4. **Identify root cause** - Test bug vs implementation bug
5. **Apply fix** - Prefer implementation fixes over test changes
6. **Re-run** - Verify fix worked

### When to Fix Tests vs Implementation

**Fix Implementation When:**
- Test correctly reflects acceptance criteria
- Implementation doesn't match expected behavior
- Edge case was missed in implementation

**Fix Test When:**
- Test has incorrect expectations
- Test setup is wrong (missing mocks, etc.)
- Test is flaky due to timing issues

### Coverage Requirements

Tests must cover:
- All acceptance criteria (at minimum)
- Happy path scenarios
- Error conditions
- Edge cases identified in story

## Error Handling

If testing cannot proceed:

```markdown
### TEST_RESULT: BLOCKED

### Blocker
[Description of what's preventing test execution]

### Environment Issues
- [List any environment problems]

### Suggested Resolution
[How to unblock]

### Partial Results
[Any tests that did run successfully]
```
