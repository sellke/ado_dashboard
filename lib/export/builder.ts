import type PptxGenJS from 'pptxgenjs';
import { buildBugBurndownSlide } from './slides/bug-burndown';
import { buildMilestoneSlide } from './slides/milestone';
import { buildOverheadSlide } from './slides/overhead';
import { buildProgramSummarySlide } from './slides/program-summary';
import { buildVelocitySlide } from './slides/velocity';
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

  const totalSlides = 1 + input.workstreams.length * 4;
  let slideIndex = 0;

  slideIndex += 1;
  await buildProgramSummarySlide(prs, input, { slideIndex, totalSlides });

  for (const ws of input.workstreams) {
    slideIndex += 1;
    await buildVelocitySlide(prs, input, { slideIndex, totalSlides }, ws);
    slideIndex += 1;
    await buildBugBurndownSlide(prs, input, { slideIndex, totalSlides }, ws);
    slideIndex += 1;
    await buildOverheadSlide(prs, input, { slideIndex, totalSlides }, ws);
    slideIndex += 1;
    await buildMilestoneSlide(prs, input, { slideIndex, totalSlides }, ws, input.milestones);
  }

  console.log('[pptx-export] buildPresentation done');
  return prs;
}
