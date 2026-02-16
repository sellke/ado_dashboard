# Story 3: RAG Assignment, Rolling Averages, and Program Aggregation

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 2 (uses metric calculator outputs)

## User Story

**As a** program manager viewing the dashboard
**I want to** see RAG color indicators, rolling averages, and program-level aggregates
**So that** I can quickly assess health status and trends across workstreams

## Acceptance Criteria

- [ ] Given a predictability value of 85%, when evaluating against ThresholdConfig (green: 80-100), then RAG = Green
- [ ] Given an overhead value of 35%, when evaluating against ThresholdConfig (amber: 30.01-45), then RAG = Amber
- [ ] Given a null metric value, when evaluating RAG, then RAG = Gray
- [ ] Given velocity (no threshold configured), when evaluating RAG, then RAG = Gray (informational only)
- [ ] Given 4 prior sprint predictability values [82, 90, 75, 88], when computing rolling average, then result = 83.75
- [ ] Given fewer than 2 prior sprints with data, when computing rolling average, then result = null
- [ ] Given 4 workstreams with velocities [20, 15, 25, 10] and planned points [30, 20, 35, 15], when computing program aggregate, then result = weighted average = (20*30 + 15*20 + 25*35 + 10*15) / (30+20+35+15) = 18.75

## Implementation Tasks

- [ ] 3.1 Write tests for RAG evaluator (green/amber/red ranges, null values, missing threshold config)
- [ ] 3.2 Implement `lib/metrics/rag.ts` -- evaluateRAG(metricName, value, thresholds) => RAGStatus
- [ ] 3.3 Write tests for rolling average calculator (4 sprints, partial data, <2 sprints, null values)
- [ ] 3.4 Implement rolling average in `lib/metrics/aggregator.ts` -- computeRollingAverage(priorValues) => Float | null
- [ ] 3.5 Write tests for program-level aggregation (weighted average, all-zero weights, single workstream, null metrics)
- [ ] 3.6 Implement program aggregation in `lib/metrics/aggregator.ts` -- computeProgramAggregate(workstreamMetrics) => MetricResult
- [ ] 3.7 Verify all edge cases: missing thresholds, empty sprint windows, mixed null/valid values

## Notes

- RAG evaluator loads ThresholdConfig from DB (or accepts pre-loaded thresholds for testability)
- ThresholdConfig already seeded with: sprintPredictability, carryOverRate, overheadPercent, agingWipDays, scopeCreepIndex
- Velocity has NO threshold entry -- always returns Gray (informational metric)
- Rolling average window = 4 prior sprints (current excluded per ADO sync contract)
- Program aggregate uses weighted average by planned story points
- If all workstream planned points = 0, program aggregate = null
- Rolling average requires minimum 2 data points to be meaningful

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing (RAG evaluator, rolling average, program aggregation)
- [ ] Code reviewed
- [ ] No linter errors
