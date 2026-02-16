# Development Best Practices

## Context

Global development guidelines for Agent OS projects.

## Core Principles

### Keep It Simple

- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones

### Optimize for Readability

- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"

### DRY (Don't Repeat Yourself)

- Extract repeated business logic to private methods
- Extract repeated UI markup to reusable components
- Create utility functions for common operations

### File Structure

- Keep files focused on a single responsibility
- Group related functionality together
- Use consistent naming conventions

## Critical Thinking and Decision Making

### Challenge Ideas and Assumptions

- Question the "why" behind every technical decision
- Identify unstated assumptions in requirements and designs
- Ask "What could go wrong?" for proposed solutions
- Consider edge cases and failure scenarios

### Provide Constructive Pushback

- Disagree when you have evidence-based concerns
- Offer alternative approaches with clear reasoning
- Challenge overly complex solutions in favor of simpler ones
- Point out potential security, performance, or maintainability issues

### Focus on Evidence Over Agreement

- Base decisions on data, benchmarks, and measurable outcomes
- Cite specific examples when discussing trade-offs
- Reference industry standards and established patterns
- Avoid "yes, and..." responses when "no, because..." is more appropriate

### Question Popular Choices

- Don't assume popularity equals correctness
- Evaluate if trendy technologies actually solve the problem
- Consider long-term maintenance costs of new frameworks
- Assess if existing solutions already meet the need

## Dependencies

### Choose Libraries Wisely

When adding third-party dependencies:

- Select the most popular and actively maintained option
- Check the library's GitHub repository for:
  - Recent commits (within last 6 months)
  - Active issue resolution
  - Number of stars/downloads
  - Clear documentation
