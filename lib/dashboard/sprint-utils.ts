import type { SprintStoryViewModel } from './types';

/**
 * Extracts a unified sprint list from sprintStoriesMap.
 * Uses the first non-empty workstream's sprints (all workstreams share the same rolling 5-sprint window).
 */
export function deriveSprintList(
  sprintStoriesMap: Record<string, SprintStoryViewModel[]> | undefined
): SprintStoryViewModel[] {
  if (!sprintStoriesMap || typeof sprintStoriesMap !== 'object') {
    return [];
  }
  const firstNonEmpty = Object.values(sprintStoriesMap).find(
    (sprints) => Array.isArray(sprints) && sprints.length > 0
  );
  return firstNonEmpty ?? [];
}
