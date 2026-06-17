import type { ExportInput } from './types';

/**
 * Ordered slide section kinds for the layered export deck.
 * Snapshot and appendix kinds are wired in later stories; the plan builder can
 * include them when `includeSnapshots` / `includeAppendices` are enabled.
 */
export type SlideSectionKind =
  | 'program-snapshot'
  | 'workstream-snapshot'
  | 'program-summary'
  | 'workstream-velocity'
  | 'workstream-bug-burndown'
  | 'workstream-overhead'
  | 'workstream-milestone'
  | 'rolling-metric-appendix'
  | 'cycle-time-appendix'
  | 'milestone-context-appendix'
  | 'partial-data-appendix';

export interface SlideDescriptor {
  kind: SlideSectionKind;
  sectionLabel: string;
  /** 1-based slide index assigned by the plan */
  slideIndex: number;
  workstreamId?: string;
  workstreamName?: string;
}

export interface SlidePlan {
  descriptors: SlideDescriptor[];
  totalSlides: number;
}

export interface SlidePlanBuildOptions {
  /** Include program/workstream snapshot slides (Story 2). Default false preserves legacy deck size. */
  includeSnapshots?: boolean;
  /** Include appendix slides when export data supports them (Story 4). Default false. */
  includeAppendices?: boolean;
}

const WORKSTREAM_SNAPSHOTS_PER_SLIDE = 4;

export { WORKSTREAM_SNAPSHOTS_PER_SLIDE };

function countWorkstreamSnapshotSlides(workstreamCount: number): number {
  if (workstreamCount === 0) return 0;
  return Math.ceil(workstreamCount / WORKSTREAM_SNAPSHOTS_PER_SLIDE);
}

function hasRollingAppendixData(input: ExportInput): boolean {
  return (input.rollingMetricAppendix?.length ?? 0) > 0;
}

function hasCycleTimeAppendixData(input: ExportInput): boolean {
  return (input.cycleTimeAppendix?.length ?? 0) > 0;
}

function hasMilestoneContextData(input: ExportInput): boolean {
  return input.milestoneContext != null;
}

function hasPartialDataCaveats(input: ExportInput): boolean {
  return (input.dataCaveats?.length ?? 0) > 0;
}

/**
 * Builds the ordered slide plan and total slide count before any slide builders run.
 * Footer page numbers must use `descriptor.slideIndex` and `plan.totalSlides`.
 */
export function buildSlidePlan(
  input: ExportInput,
  options: SlidePlanBuildOptions = {}
): SlidePlan {
  const includeSnapshots = options.includeSnapshots ?? false;
  const includeAppendices = options.includeAppendices ?? false;

  const descriptors: SlideDescriptor[] = [];
  let slideIndex = 0;

  const push = (descriptor: Omit<SlideDescriptor, 'slideIndex'>) => {
    slideIndex += 1;
    descriptors.push({ ...descriptor, slideIndex });
  };

  if (includeSnapshots) {
    push({ kind: 'program-snapshot', sectionLabel: 'Program Health Snapshot' });

    const snapshotSlideCount = countWorkstreamSnapshotSlides(input.workstreams.length);
    for (let i = 0; i < snapshotSlideCount; i += 1) {
      push({
        kind: 'workstream-snapshot',
        sectionLabel: `Workstream Health Snapshot${snapshotSlideCount > 1 ? ` (${i + 1}/${snapshotSlideCount})` : ''}`,
      });
    }
  }

  push({ kind: 'program-summary', sectionLabel: 'Program Summary' });

  for (const ws of input.workstreams) {
    push({
      kind: 'workstream-velocity',
      sectionLabel: 'Velocity',
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName,
    });
    push({
      kind: 'workstream-bug-burndown',
      sectionLabel: 'Bug Burndown',
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName,
    });
    push({
      kind: 'workstream-overhead',
      sectionLabel: 'Overhead',
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName,
    });
    push({
      kind: 'workstream-milestone',
      sectionLabel: 'Milestones',
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName,
    });
  }

  if (includeAppendices) {
    if (hasRollingAppendixData(input)) {
      push({ kind: 'rolling-metric-appendix', sectionLabel: 'Rolling Metrics Appendix' });
    }
    if (hasCycleTimeAppendixData(input)) {
      push({ kind: 'cycle-time-appendix', sectionLabel: 'Cycle Time Appendix' });
    }
    if (hasMilestoneContextData(input)) {
      push({ kind: 'milestone-context-appendix', sectionLabel: 'Milestone Context Appendix' });
    }
    if (hasPartialDataCaveats(input)) {
      push({ kind: 'partial-data-appendix', sectionLabel: 'Data Coverage Appendix' });
    }
  }

  return {
    descriptors,
    totalSlides: slideIndex,
  };
}

/** Slide context for footer/page numbering — derived from a plan descriptor. */
export function slideContextFromPlan(
  plan: SlidePlan,
  descriptor: SlideDescriptor
): { slideIndex: number; totalSlides: number } {
  return { slideIndex: descriptor.slideIndex, totalSlides: plan.totalSlides };
}
