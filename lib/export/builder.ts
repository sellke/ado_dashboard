import type PptxGenJS from 'pptxgenjs';
import { buildProgramSummarySlide } from './slides/program-summary';
import { buildVelocitySlide } from './slides/velocity';
import { buildBugBurndownSlide } from './slides/bug-burndown';
import { buildOverheadSlide } from './slides/overhead';
import { buildMilestoneSlide } from './slides/milestone';
import type { ExportInput } from './types';

/**
 * Builds a complete pptxgenjs Presentation from dashboard data.
 *
 * Slide order:
 *   1. Program Summary
 *   2–N. Per workstream (in input.workstreams order):
 *        Velocity → Bug Burndown → Overhead → Milestone
 *
 * Total slides = 1 + (workstreams.length × 4). Each builder is async (captures
 * Recharts charts as PNG images). Executes serially to avoid DOM mount spikes.
 */
export async function buildPresentation(
  Pptx: typeof PptxGenJS,
  input: ExportInput
): Promise<InstanceType<typeof PptxGenJS>> {
  console.log(
    `[pptx-export] buildPresentation start — workstreams=${input.workstreams.length} ` +
      `programTrendSprints=${input.programTrendSprints.length} ` +
      `milestones=${input.milestones.length}`
  );

  const prs = new Pptx();
  prs.layout = 'LAYOUT_WIDE';

  await buildProgramSummarySlide(prs, input);

  for (const ws of input.workstreams) {
    await buildVelocitySlide(prs, ws);
    await buildBugBurndownSlide(prs, ws);
    await buildOverheadSlide(prs, ws);
    await buildMilestoneSlide(prs, ws, input.milestones);
  }

  console.log('[pptx-export] buildPresentation done');
  return prs;
}
