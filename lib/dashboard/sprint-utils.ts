import type { SprintStoryViewModel } from './types';

/**
 * Extracts a unified sprint list from sprintStoriesMap, summing totalStories
 * across all workstreams for each sprint.
 */
export function deriveSprintList(
  sprintStoriesMap: Record<string, SprintStoryViewModel[]> | undefined
): SprintStoryViewModel[] {
  if (!sprintStoriesMap || typeof sprintStoriesMap !== 'object') {
    return [];
  }

  const allLists = Object.values(sprintStoriesMap).filter(
    (sprints) => Array.isArray(sprints) && sprints.length > 0
  );
  if (allLists.length === 0) return [];

  const merged = new Map<string, SprintStoryViewModel>();

  for (const list of allLists) {
    for (const sprint of list) {
      const existing = merged.get(sprint.id);
      if (!existing) {
        merged.set(sprint.id, { ...sprint });
      } else {
        existing.totalStories += sprint.totalStories;
      }
    }
  }

  // Preserve sprint order from the first non-empty list.
  return allLists[0].map((s) => merged.get(s.id)!);
}
