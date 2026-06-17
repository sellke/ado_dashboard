import type PptxGenJS from 'pptxgenjs';
import {
  buildCycleTimeAppendixSlide,
  buildMilestoneContextAppendixSlide,
  buildPartialDataAppendixSlide,
  buildRollingMetricAppendixSlide,
} from './slides/appendix';
import { buildBugBurndownSlide } from './slides/bug-burndown';
import { buildMilestoneSlide } from './slides/milestone';
import { buildOverheadSlide } from './slides/overhead';
import { buildProgramSnapshotSlide } from './slides/program-snapshot';
import { buildProgramSummarySlide } from './slides/program-summary';
import { buildVelocitySlide } from './slides/velocity';
import {
  buildWorkstreamSnapshotSlide,
  WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE,
} from './slides/workstream-snapshot';
import {
  buildSlidePlan,
  slideContextFromPlan,
  type SlideDescriptor,
  type SlidePlan,
  type SlidePlanBuildOptions,
} from './slide-plan';
import type { ExportInput } from './types';

/**
 * Layout decision (Story 1): keep pptxgenjs `LAYOUT_WIDE` (13.33×7.5 in) for compatibility
 * with existing slide coordinates in `mdt-theme.ts` and all slide builders. The MDT skill
 * documents a 16×9 custom canvas; migrating would require retuning every position in the
 * same change. New snapshot/appendix slides use the same coordinate system until a dedicated
 * layout migration is scheduled.
 */
export const EXPORT_PRESENTATION_LAYOUT = 'LAYOUT_WIDE' as const;

const DEFAULT_PLAN_OPTIONS: SlidePlanBuildOptions = {
  includeSnapshots: true,
  includeAppendices: true,
};

function workstreamSnapshotCards(
  input: ExportInput,
  plan: SlidePlan,
  descriptor: SlideDescriptor
): { cards: NonNullable<ExportInput['workstreamSnapshots']>; pageLabel?: string } {
  const snapshots = input.workstreamSnapshots ?? [];
  const snapshotDescriptors = plan.descriptors.filter((d) => d.kind === 'workstream-snapshot');
  const pageIndex = snapshotDescriptors.findIndex((d) => d.slideIndex === descriptor.slideIndex);
  const start = pageIndex * WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE;
  const cards = snapshots.slice(start, start + WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE);
  const pageLabel =
    snapshotDescriptors.length > 1
      ? `Visible dashboard scope (${pageIndex + 1}/${snapshotDescriptors.length})`
      : 'Visible dashboard scope';
  return { cards, pageLabel };
}

async function buildDescriptorSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  plan: SlidePlan,
  descriptor: SlideDescriptor,
  ctx: { slideIndex: number; totalSlides: number }
): Promise<void> {
  const ws =
    descriptor.workstreamId != null
      ? input.workstreams.find((w) => w.workstreamId === descriptor.workstreamId)
      : undefined;

  switch (descriptor.kind) {
    case 'program-snapshot':
      await buildProgramSnapshotSlide(prs, input, ctx);
      break;
    case 'workstream-snapshot': {
      const { cards, pageLabel } = workstreamSnapshotCards(input, plan, descriptor);
      await buildWorkstreamSnapshotSlide(prs, input, ctx, cards, pageLabel);
      break;
    }
    case 'program-summary':
      await buildProgramSummarySlide(prs, input, ctx);
      break;
    case 'workstream-velocity':
      if (ws) await buildVelocitySlide(prs, input, ctx, ws);
      break;
    case 'workstream-bug-burndown':
      if (ws) await buildBugBurndownSlide(prs, input, ctx, ws);
      break;
    case 'workstream-overhead':
      if (ws) await buildOverheadSlide(prs, input, ctx, ws);
      break;
    case 'workstream-milestone':
      if (ws) await buildMilestoneSlide(prs, input, ctx, ws, input.milestones);
      break;
    case 'rolling-metric-appendix':
      await buildRollingMetricAppendixSlide(
        prs,
        input,
        ctx,
        input.rollingMetricAppendix ?? []
      );
      break;
    case 'cycle-time-appendix':
      await buildCycleTimeAppendixSlide(prs, input, ctx, input.cycleTimeAppendix ?? []);
      break;
    case 'milestone-context-appendix':
      await buildMilestoneContextAppendixSlide(prs, input, ctx, input.milestoneContext);
      break;
    case 'partial-data-appendix':
      await buildPartialDataAppendixSlide(prs, input, ctx, input.dataCaveats ?? []);
      break;
    default: {
      const _exhaustive: never = descriptor.kind;
      void _exhaustive;
    }
  }
}

/**
 * Builds a complete pptxgenjs Presentation from dashboard data using an explicit slide plan.
 */
export async function buildPresentation(
  Pptx: typeof PptxGenJS,
  input: ExportInput,
  planOptions: SlidePlanBuildOptions = DEFAULT_PLAN_OPTIONS
): Promise<InstanceType<typeof PptxGenJS>> {
  const plan = buildSlidePlan(input, planOptions);

  console.log(
    `[pptx-export] buildPresentation start — planSlides=${plan.totalSlides} ` +
      `workstreams=${input.workstreams.length} ` +
      `programTrendSprints=${input.programTrendSprints.length} ` +
      `milestones=${input.milestones.length}`
  );

  const prs = new Pptx();
  prs.layout = EXPORT_PRESENTATION_LAYOUT;

  for (const descriptor of plan.descriptors) {
    const ctx = slideContextFromPlan(plan, descriptor);
    await buildDescriptorSlide(prs, input, plan, descriptor, ctx);
  }

  console.log('[pptx-export] buildPresentation done');
  return prs;
}
