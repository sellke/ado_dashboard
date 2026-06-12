/**
 * Metric definitions registry — single source of truth for dashboard tooltip copy.
 *
 * Copy describes the CURRENT hardcoded calculator behaviour (see `calculators.ts`,
 * `aggregator.ts`, `rolling.ts`, `rag.ts`, `trend-service.ts`) and the seeded
 * `ThresholdConfig` defaults in `prisma/seed.ts`. It is static — not loaded from the
 * database at runtime. A future metric-config UI may supersede the RAG threshold copy.
 *
 * Program and workstream surfaces share a single `MetricId`; calculation strings carry
 * scope qualifiers ("workstream tile…", "program tile…") where the aggregation differs.
 *
 * @module lib/metrics/definitions
 */

/** Stable identifiers for every metric surface that exposes a definition tooltip. */
export type MetricId =
  | 'velocity'
  | 'velocityRate'
  | 'deliveryToBugRatio'
  | 'overheadPercent'
  | 'carryOverRate'
  | 'chartVelocity'
  | 'chartBugBurndown';

export interface MetricDefinition {
  /** One-sentence, plain-language description of what the number represents. */
  definition: string;
  /** How the number is derived: window, exclusions, aggregation, scope qualifiers. */
  calculation: string;
  /** RAG threshold explanation — only for metrics that render a RAG badge. */
  ragExplanation?: string;
}

/**
 * Registry of metric copy keyed by `MetricId`.
 *
 * Threshold numbers in `ragExplanation` must match the seeded `ThresholdConfig`
 * rows in `prisma/seed.ts` (`overheadPercent`, `carryOverRate`) and the velocity
 * trend rules in `assignVelocityRag` (`rag.ts`).
 */
export const METRIC_DEFINITIONS: Record<MetricId, MetricDefinition> = {
  velocity: {
    definition: 'Story points completed from delivery work, excluding Bugs and Spikes.',
    calculation:
      'Sum of story points for Done-like items (Closed, Done, Resolved); Bugs and Spikes excluded. Workstream tiles show the 4-sprint rolling average (current sprint excluded); the program tile sums each workstream velocity.',
    ragExplanation:
      'Compared to the 4-sprint rolling average: Green at or above 100%, Amber 70–99%, Red below 70%.',
  },
  velocityRate: {
    definition: 'Delivery efficiency — story points completed per net capacity hour.',
    calculation:
      'Done-like story points ÷ net capacity hours, where net capacity = gross hours − overhead hours. The program tile shows the average rate across workstreams. N/A when net capacity is zero or unavailable.',
  },
  deliveryToBugRatio: {
    definition: 'Bug-fixing effort per delivery hour.',
    calculation:
      'Bug hours ÷ delivery hours. Delivery hours are completed delivery story points converted through the average velocity rate (points per hour) over the rolling window. Shows — when bug hours are zero.',
    ragExplanation:
      'Lower is healthier: Green 0–0.25, Amber 0.26–0.5, Red above 0.5. Zero bug hours with delivery is Green.',
  },
  overheadPercent: {
    definition: 'Share of capacity spent on non-delivery work (ceremonies, bugs, spikes, support).',
    calculation:
      '(ceremony + bug + spike + support hours) ÷ gross hours × 100. The program tile is a weighted average by planned points across workstreams. N/A when gross hours is zero.',
    ragExplanation: 'Green 0–30%, Amber 30.01–45%, Red above 45%.',
  },
  carryOverRate: {
    definition: 'Share of planned story points not completed within the sprint.',
    calculation:
      'Carry-over points ÷ planned points × 100; Bugs and Spikes excluded from the point plan. The program tile is a weighted average by planned points across workstreams. N/A when planned points is zero.',
    ragExplanation: 'Green 0–10%, Amber 10.01–25%, Red above 25%.',
  },
  chartVelocity: {
    definition: 'Per-sprint completed story points over time.',
    calculation:
      'Each point is a sprint velocity (Done-like story points, Bugs and Spikes excluded). A forecast line appears when a velocity prediction is available.',
  },
  chartBugBurndown: {
    definition: 'Open versus closed bug counts per sprint.',
    calculation:
      'Open = bugs in New/Active states; Closed = bugs in Resolved/Testing/Closed states within the sprint window.',
  },
};

/** Prefix lines used to format the multiline tooltip body. */
const DEFINITION_PREFIX = 'Definition:';
const CALCULATION_PREFIX = 'Calculation:';

/**
 * Format the multiline definition tooltip body for a metric.
 *
 * @returns A two-line string (`Definition:` / `Calculation:`), or an empty string
 * when `id` is not a known `MetricId` (defensive — callers treat empty as "no hint").
 */
export function getMetricTooltip(id: MetricId): string {
  const def = METRIC_DEFINITIONS[id];
  if (!def) {
    return '';
  }
  return `${DEFINITION_PREFIX} ${def.definition}\n${CALCULATION_PREFIX} ${def.calculation}`;
}

/**
 * Get the RAG threshold explanation for a metric.
 *
 * @returns The RAG explanation string for metrics that render a RAG badge
 * (`velocity`, `overheadPercent`, `carryOverRate`), otherwise `null`.
 */
export function getRagTooltip(id: MetricId): string | null {
  return METRIC_DEFINITIONS[id]?.ragExplanation ?? null;
}
