# Implement Story Command (implement-story)

## Overview

Execute a full SDLC workflow for a user story using orchestrated sub-agents. This command takes a story from specification through implementation, review, testing, and documentation using a multi-agent architecture with feedback loops.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION AGENT                       │
│              (Reviews story, coordinates flow)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CODING AGENT                            │
│              (Implements the code changes)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      REVIEW AGENT                            │
│              (Reviews implementation quality)                │
│                                                              │
│   ┌─────────┐                          ┌──────────────────┐ │
│   │  PASS   │──────────────────────────▶│ Continue Flow   │ │
│   └─────────┘                          └──────────────────┘ │
│                                                              │
│   ┌─────────┐   Resume with feedback   ┌──────────────────┐ │
│   │  FAIL   │──────────────────────────▶│ Back to Coding  │ │
│   └─────────┘                          └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │ (on pass)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     TESTING AGENT                            │
│         (Runs tests, fixes failures if needed)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  DOCUMENTATION AGENT                         │
│         (Updates docs if implementation warrants)            │
└─────────────────────────────────────────────────────────────┘
```

## Command Process

### Phase 1: Story Selection & Context Gathering

#### Step 1.1: Story Discovery

**If no story specified:**

Use AskQuestion to present available stories:

```
AskQuestion({
  title: "Story Selection - Which story to implement?",
  questions: [
    {
      id: "spec_selection",
      prompt: "Which specification?",
      options: [
        // Dynamically populated from .code-captain/specs/
        { id: "spec_1", label: "[DATE]-[feature-name] (X stories)" },
        { id: "spec_2", label: "[DATE]-[feature-name] (Y stories)" }
      ]
    }
  ]
})
```

Then present stories from the selected spec:

```
AskQuestion({
  title: "Story Selection",
  questions: [
    {
      id: "story_selection",
      prompt: "Which story to implement?",
      options: [
        // Dynamically populated from user-stories/
        { id: "story_1", label: "Story 1: [Title] - [Status]" },
        { id: "story_2", label: "Story 2: [Title] - [Status]" }
      ]
    }
  ]
})
```

#### Step 1.2: Context Gathering (Orchestration Agent Work)

**Load all relevant context:**

1. **Story file**: `user-stories/story-N-{name}.md`
2. **Specification**: `spec.md` and `spec-lite.md`
3. **Technical spec**: `sub-specs/technical-spec.md`
4. **Codebase analysis**: Use `codebase_search` to understand:
   - Current architecture patterns
   - Related existing functionality
   - Testing patterns and conventions
   - Code style and conventions

**Create implementation plan:**

Based on the story's acceptance criteria and implementation tasks, create a mental model of:
- Files that need to be created/modified
- Testing approach
- Integration points
- Potential challenges

#### Step 1.3: Initialize Tracking

```json
{
  "todos": [
    {
      "id": "context-gathering",
      "content": "Gather context from story, spec, and codebase",
      "status": "completed"
    },
    {
      "id": "coding-phase",
      "content": "Launch coding agent to implement story",
      "status": "in_progress"
    },
    {
      "id": "review-phase",
      "content": "Launch review agent to validate implementation",
      "status": "pending"
    },
    {
      "id": "testing-phase",
      "content": "Launch testing agent to verify tests pass",
      "status": "pending"
    },
    {
      "id": "documentation-phase",
      "content": "Launch documentation agent to update docs",
      "status": "pending"
    },
    {
      "id": "story-completion",
      "content": "Update story status and present summary",
      "status": "pending"
    }
  ]
}
```

### Phase 2: Coding Agent Execution

#### Step 2.1: Launch Coding Agent

> **Agent Reference:** See `.cursor/agents/coding-agent.md` for full specification.

```
Task({
  subagent_type: "generalPurpose",
  description: "Implement story code",
  prompt: `You are the Coding Agent for story implementation.

## Your Mission

Implement the code changes for the following user story, following TDD principles.

## Story Details

**Story file path:** {story_file_path}
**Story content:**
{full_story_content}

## Specification Context

**Spec summary:**
{spec_lite_content}

**Technical approach:**
{technical_spec_summary}

## Codebase Context

**Relevant patterns found:**
{codebase_patterns}

**Related files:**
{related_files}

## Implementation Requirements

1. **Follow TDD**: Write tests FIRST, then implement to make them pass
2. **Match patterns**: Follow existing codebase conventions
3. **Small commits**: Make logical, incremental changes
4. **Document as you go**: Add inline comments for complex logic

## Tasks to Complete

{story_implementation_tasks}

## Acceptance Criteria to Satisfy

{story_acceptance_criteria}

## Output Requirements

When complete, provide a summary:
- Files created/modified (with brief description of changes)
- Tests written (file paths and test names)
- Any deviations from the plan and why
- Any concerns or areas needing review attention

Do NOT mark the story as complete - the review and testing phases will handle that.
`
})
```

#### Step 2.2: Capture Coding Agent Output

Store the coding agent's output including:
- Agent ID (for potential resume)
- Files modified
- Tests written
- Implementation notes
- Any concerns flagged

### Phase 3: Review Agent Execution

#### Step 3.1: Launch Review Agent

> **Agent Reference:** See `.cursor/agents/review-agent.md` for full specification.

```
Task({
  subagent_type: "generalPurpose",
  readonly: true,
  description: "Review implementation",
  prompt: `You are the Review Agent for story implementation validation.

## Your Mission

Review the implementation completed by the Coding Agent and determine if it meets quality standards.

## Story Being Implemented

**Story file path:** {story_file_path}
**Story content:**
{full_story_content}

## Implementation Summary from Coding Agent

{coding_agent_output}

## Review Checklist

### 1. Acceptance Criteria Verification
For each acceptance criterion, verify the implementation satisfies it:
{acceptance_criteria_with_checkboxes}

### 2. Code Quality Review
- [ ] Follows existing codebase patterns
- [ ] No obvious bugs or logic errors
- [ ] Proper error handling
- [ ] No security vulnerabilities
- [ ] Code is readable and maintainable

### 3. Test Coverage Review
- [ ] Tests exist for all acceptance criteria
- [ ] Tests cover edge cases
- [ ] Tests follow project conventions
- [ ] Test names are descriptive

### 4. Integration Review
- [ ] No breaking changes to existing functionality
- [ ] Proper imports and exports
- [ ] No circular dependencies

## Output Format

You MUST output your review in this exact format:

### REVIEW_RESULT: [PASS/FAIL]

### Summary
[2-3 sentence summary of the review]

### Checklist Results
[Complete checklist with findings]

### Issues Found (if FAIL)
For each issue:
- **Issue:** [Clear description]
- **Location:** [File and line if applicable]
- **Severity:** [Critical/Major/Minor]
- **Suggested Fix:** [How to resolve]

### Recommendations (optional)
[Any non-blocking improvements for future]
`
})
```

#### Step 3.2: Process Review Result

**Parse the review output:**

1. Extract `REVIEW_RESULT` (PASS or FAIL)
2. If PASS → Continue to Testing Phase
3. If FAIL → Resume Coding Agent with feedback

**On FAIL - Resume Coding Agent:**

```
Task({
  subagent_type: "generalPurpose",
  resume: "{coding_agent_id}",
  description: "Fix review issues",
  prompt: `The Review Agent found issues with your implementation that need to be fixed.

## Review Feedback

### Result: FAIL

### Issues to Address

{review_issues}

## Required Actions

1. Address each issue listed above
2. Ensure all acceptance criteria are met
3. Run tests locally to verify fixes
4. Provide updated summary of changes

Focus on the Critical and Major issues first. Minor issues can be noted for follow-up if time-constrained.
`
})
```

**Review Loop:**
- Maximum 3 review iterations
- If still failing after 3 iterations, escalate to user with detailed report

### Phase 4: Testing Agent Execution

#### Step 4.1: Launch Testing Agent

> **Agent Reference:** See `.cursor/agents/testing-agent.md` for full specification.

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

#### Step 4.2: Process Testing Result

**On PASS:** Continue to Documentation Phase

**On FAIL:** 
1. Analyze failure type (test bug vs implementation bug)
2. If implementation bug → Resume Coding Agent with test failure details
3. If test bug → Testing Agent should have fixed it
4. Maximum 2 test-fix iterations before escalating

### Phase 5: Documentation Agent Execution

#### Step 5.1: Launch Documentation Agent

> **Agent Reference:** See `.cursor/agents/documentation-agent.md` for full specification.

The Documentation Agent creates comprehensive VitePress documentation in `docs/` with Mermaid diagrams, feature docs, and component reference.

```
Task({
  subagent_type: "generalPurpose",
  description: "Update VitePress documentation",
  readonly: false,  // CRITICAL: Must be false - agent creates documentation files
  prompt: `You are the Documentation Agent for the Weather App VitePress documentation.

## Your Mission

Create or update developer documentation for the implemented story. Documentation lives in \`docs/\` and uses VitePress with Mermaid diagrams.

## Story Implemented

**Story file path:** {story_file_path}
**Story content:**
{full_story_content}

## Specification Context

{spec_lite_content}

## Implementation Summary

**Files created/modified:**
{files_changed}

**New functionality added:**
{functionality_summary}

## Documentation Structure (VitePress)

\`\`\`
docs/
├── .vitepress/config.ts        # Sidebar and navigation config
├── index.md                    # Home page
├── guide/                      # Getting started guides
├── architecture/               # Architecture docs
│   └── index.md
├── features/                   # Feature documentation
│   ├── index.md               # Feature index
│   └── {feature-name}.md      # Individual feature docs
├── components/                 # Component documentation
│   ├── index.md               # Component index
│   └── {component-name}.md    # Individual component docs
└── reference/                  # API reference
    └── api.md
\`\`\`

## Documentation Tasks

### 1. Feature Documentation
Create \`docs/features/{feature-name}.md\` with:
- Overview and purpose
- Architecture diagram (Mermaid)
- Components table with locations
- State management approach
- Usage examples
- Related files list

### 2. Component Documentation
For new reusable components, create \`docs/components/{component-name}.md\` with:
- Purpose and when to use
- Props interface table
- Usage examples
- Accessibility notes

### 3. Update VitePress Sidebar
Add new pages to \`docs/.vitepress/config.ts\` sidebar configuration.

### 4. Update Feature/Component Index
Add to the table in \`docs/features/index.md\` or \`docs/components/index.md\`.

### 5. Architecture Updates
If major changes, update \`docs/architecture/index.md\` diagrams.

### 6. Inline Documentation
Add JSDoc comments to source files.

## Mermaid Diagram Examples

**Component hierarchy:**
\`\`\`mermaid
graph TB
    A[Parent] --> B[Child]
    A --> C[Child]
\`\`\`

**Data flow:**
\`\`\`mermaid
sequenceDiagram
    User->>Component: Action
    Component->>Hook: Call
    Hook->>API: Request
    API-->>Hook: Response
    Hook-->>Component: Update
\`\`\`

**State diagram:**
\`\`\`mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Success
    Loading --> Error
\`\`\`

## Output Format

### DOCS_UPDATED: [YES/NO]

### Documentation Changes

#### Files Created
- **File:** [path]
- **Purpose:** [what this doc covers]

#### Files Updated
- **File:** [path]
- **Section:** [what was updated]
- **Change:** [brief description]

#### Mermaid Diagrams Added
- [Description of diagrams]

#### Inline Documentation Added
- **File:** [source file]
- **Added:** [what was documented]

### Documentation Coverage Summary
- Architecture: [Updated/Created/No change]
- Feature docs: [Updated/Created/No change]
- Component docs: [Updated/Created/No change]
- Inline docs: [Added to X files]
`
})
```

### Phase 6: Story Completion

#### Step 6.1: Update Story Status

Update the story file with completion status:

```markdown
# Story N: [Title]

> **Status:** Completed ✅
> **Priority:** [Priority]
> **Dependencies:** [Dependencies]

## User Story
[unchanged]

## Acceptance Criteria
- [x] Criterion 1 ✅
- [x] Criterion 2 ✅
- [x] Criterion 3 ✅

## Implementation Tasks
- [x] N.1 Task 1 ✅
- [x] N.2 Task 2 ✅
- [x] N.3 Task 3 ✅

## Definition of Done
- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100%) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
```

#### Step 6.2: Update Stories README

Update progress in `user-stories/README.md`.

#### Step 6.3: Present Completion Summary

```
✅ Story implementation completed successfully!

**Story:** Story N: [Title]

## SDLC Summary

| Phase | Agent | Result |
|-------|-------|--------|
| Implementation | Coding Agent | ✅ Completed |
| Review | Review Agent | ✅ Passed (iteration 1) |
| Testing | Testing Agent | ✅ 100% pass rate |
| Documentation | Documentation Agent | ✅ Updated |

## Implementation Details
- Files modified: X
- Tests added: X
- Review iterations: 1
- Documentation updated: Yes/No

## Files Changed
[List of files with brief descriptions]

## Next Steps
- Story N+1: [Title] is ready to implement
- Or run `/status` to see overall spec progress
```

## Error Handling

### Agent Failure Recovery

**Coding Agent Failure:**
- Capture error details
- Present to user with option to retry or manually intervene

**Review Loop Exceeded (3 iterations):**
```
⚠️ Review loop exceeded maximum iterations

The implementation has not passed review after 3 attempts.

**Latest Issues:**
{remaining_issues}

**Options:**
1. Continue anyway (testing may reveal issues)
2. Manual intervention required
3. Abandon story and reassess requirements

How would you like to proceed?
```

**Testing Failure After Fixes:**
```
⚠️ Tests failing after fix attempts

**Failing Tests:**
{test_failures}

**Options:**
1. Skip failing tests (mark as known issues)
2. Manual debugging required
3. Rollback changes and reassess approach

How would you like to proceed?
```

### State Persistence

For long-running workflows, persist state to allow recovery:

```
.code-captain/state/implement-story-{timestamp}.json
{
  "story_path": "...",
  "current_phase": "review",
  "coding_agent_id": "...",
  "review_iteration": 1,
  "files_modified": [...],
  "review_feedback": {...}
}
```

## Tool Integration

**Primary Tools:**
- `todo_write` - Progress tracking
- `codebase_search` - Understanding existing code
- `file_search` - Locating relevant files
- `read_file` - Loading story and spec content
- `run_terminal_cmd` - Running tests

**Sub-Agent Tools:**
- `Task` with `subagent_type: "generalPurpose"` for all agents
- `resume` parameter for continuing failed agents

## Integration with Code Captain Ecosystem

**Prerequisites:**
- Story must exist (created by `/create-spec`)
- Story status must be "Not Started" or "In Progress"

**Post-Completion:**
- Story marked as "Completed"
- README progress updated
- Can trigger `/status` for overview

## Quality Standards

**Review Quality Gates:**
- All acceptance criteria satisfied
- Code follows existing patterns
- Tests provide adequate coverage
- No security vulnerabilities

**Testing Requirements:**
- 100% pass rate mandatory
- Both new and regression tests must pass
- Edge cases covered

**Documentation Standards:**
- User-facing changes documented
- API changes reflected
- README updated if needed
