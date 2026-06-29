/**
 * Sprint stories adapter.
 * Maps GET /api/sprints/stories response to UI-friendly view models.
 * Follows the same adapter pattern as adapter.ts.
 */

import { buildAdoWorkItemUrl } from '../ado/urls';
import { STATUS_GROUP_ORDER, type StatusGroup } from '../sprints/status-mapping';
import type {
  SprintStoriesApiResponse,
  SprintStoryViewModel,
  StatusGroupViewModel,
  StoryRowViewModel,
} from './types';

function mapStoryRow(story: SprintStoriesApiResponse['sprints'][0]['stories'][0]): StoryRowViewModel {
  return {
    adoId: `#${story.adoId}`,
    title: story.title,
    assignedTo: story.assignedTo ?? 'Unassigned',
    storyPoints: story.storyPoints != null ? String(story.storyPoints) : '\u2014',
    state: story.state,
    statusGroup: story.statusGroup,
    adoUrl: buildAdoWorkItemUrl(story.adoId),
  };
}

/** Map a sprint stories API response to SprintStoryViewModel array. */
export function mapSprintStoriesResponse(
  response: SprintStoriesApiResponse
): SprintStoryViewModel[] {
  return response.sprints.map((sprint) => {
    const rowsByGroup = new Map<StatusGroup, StoryRowViewModel[]>();
    const pointsByGroup = new Map<StatusGroup, number>();
    for (const story of sprint.stories) {
      const row = mapStoryRow(story);
      if (!rowsByGroup.has(row.statusGroup)) {
        rowsByGroup.set(row.statusGroup, []);
      }
      rowsByGroup.get(row.statusGroup)!.push(row);
      pointsByGroup.set(
        row.statusGroup,
        (pointsByGroup.get(row.statusGroup) ?? 0) + (story.storyPoints ?? 0)
      );
    }

    const statusGroups: StatusGroupViewModel[] = STATUS_GROUP_ORDER
      .filter((group) => rowsByGroup.has(group))
      .map((group) => ({
        group,
        stories: rowsByGroup.get(group)!,
        totalStoryPoints: pointsByGroup.get(group) ?? 0,
      }));

    return {
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      isCurrent: sprint.isCurrent,
      statusGroups,
      totalStories: sprint.stories.length,
    };
  });
}
