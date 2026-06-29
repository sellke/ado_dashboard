/**
 * Tests for sprint-stories-adapter.ts
 * Validates view model mapping, formatting, ADO URLs, empty states, and status group ordering.
 */

import { mapSprintStoriesResponse } from '@/lib/dashboard/sprint-stories-adapter';
import type { SprintStoriesApiResponse } from '@/lib/dashboard/types';

const ADO_BASE = 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit';

function buildResponse(
  overrides: Partial<SprintStoriesApiResponse['sprints'][0]> = {}
): SprintStoriesApiResponse {
  return {
    sprints: [
      {
        id: 'sprint-1',
        name: 'Sprint 2026.05',
        startDate: '2026-02-24T00:00:00.000Z',
        endDate: '2026-03-07T00:00:00.000Z',
        isCurrent: true,
        stories: [],
        ...overrides,
      },
    ],
  };
}

describe('mapSprintStoriesResponse', () => {
  it('maps a full API response to SprintStoryViewModel array', () => {
    const response = buildResponse({
      stories: [
        { adoId: 12345, title: 'Auth flow', assignedTo: 'Jane Doe', storyPoints: 5, state: 'Active', statusGroup: 'Active' },
        { adoId: 12346, title: 'Login page', assignedTo: null, storyPoints: 3, state: 'New', statusGroup: 'Planned' },
      ],
    });

    const result = mapSprintStoriesResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sprint-1');
    expect(result[0].name).toBe('Sprint 2026.05');
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].totalStories).toBe(2);
    expect(result[0].statusGroups).toHaveLength(2);
  });

  it('formats adoId as "#12345"', () => {
    const response = buildResponse({
      stories: [
        { adoId: 12345, title: 'Story', assignedTo: null, storyPoints: 5, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].stories[0].adoId).toBe('#12345');
  });

  it('constructs correct ADO work item URL', () => {
    const response = buildResponse({
      stories: [
        { adoId: 99999, title: 'Story', assignedTo: null, storyPoints: 1, state: 'New', statusGroup: 'Planned' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].stories[0].adoUrl).toBe(`${ADO_BASE}/99999`);
  });

  it('displays "—" when storyPoints is null', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Unestimated', assignedTo: 'Alice', storyPoints: null, state: 'New', statusGroup: 'Planned' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].stories[0].storyPoints).toBe('\u2014');
  });

  it('displays story points as string when present', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Estimated', assignedTo: null, storyPoints: 8, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].stories[0].storyPoints).toBe('8');
  });

  it('displays "Unassigned" when assignedTo is null', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Unassigned', assignedTo: null, storyPoints: 3, state: 'New', statusGroup: 'Planned' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].stories[0].assignedTo).toBe('Unassigned');
  });

  it('preserves assignedTo when present', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Assigned', assignedTo: 'Jane Doe', storyPoints: 3, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].stories[0].assignedTo).toBe('Jane Doe');
  });

  it('orders status groups: Planned → Active → Testing → Resolved → Completed', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Closed', assignedTo: null, storyPoints: 1, state: 'Closed', statusGroup: 'Completed' },
        { adoId: 2, title: 'Active', assignedTo: null, storyPoints: 2, state: 'Active', statusGroup: 'Active' },
        { adoId: 3, title: 'New', assignedTo: null, storyPoints: 3, state: 'New', statusGroup: 'Planned' },
        { adoId: 4, title: 'Testing', assignedTo: null, storyPoints: 4, state: 'Testing', statusGroup: 'Testing' },
        { adoId: 5, title: 'Resolved', assignedTo: null, storyPoints: 5, state: 'Resolved', statusGroup: 'Resolved' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    const groupOrder = result[0].statusGroups.map((g) => g.group);

    expect(groupOrder).toEqual(['Planned', 'Active', 'Testing', 'Resolved', 'Completed']);
  });

  it('excludes empty status groups from view model', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Active', assignedTo: null, storyPoints: 3, state: 'Active', statusGroup: 'Active' },
        { adoId: 2, title: 'Closed', assignedTo: null, storyPoints: 5, state: 'Closed', statusGroup: 'Completed' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    const groupNames = result[0].statusGroups.map((g) => g.group);

    expect(groupNames).toEqual(['Active', 'Completed']);
    expect(groupNames).not.toContain('Planned');
    expect(groupNames).not.toContain('Resolved');
  });

  it('handles sprint with no stories (empty statusGroups)', () => {
    const response = buildResponse({ stories: [] });

    const result = mapSprintStoriesResponse(response);

    expect(result[0].statusGroups).toEqual([]);
    expect(result[0].totalStories).toBe(0);
  });

  it('maps multiple sprints preserving order', () => {
    const response: SprintStoriesApiResponse = {
      sprints: [
        {
          id: 'sprint-5',
          name: 'Sprint 2026.05',
          startDate: '2026-02-24T00:00:00.000Z',
          endDate: '2026-03-07T00:00:00.000Z',
          isCurrent: true,
          stories: [
            { adoId: 1, title: 'S1', assignedTo: null, storyPoints: 3, state: 'Active', statusGroup: 'Active' },
          ],
        },
        {
          id: 'sprint-4',
          name: 'Sprint 2026.04',
          startDate: '2026-02-10T00:00:00.000Z',
          endDate: '2026-02-21T00:00:00.000Z',
          isCurrent: false,
          stories: [],
        },
      ],
    };

    const result = mapSprintStoriesResponse(response);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('sprint-5');
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].totalStories).toBe(1);
    expect(result[1].id).toBe('sprint-4');
    expect(result[1].isCurrent).toBe(false);
    expect(result[1].totalStories).toBe(0);
  });

  it('groups multiple stories in the same status group', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'New A', assignedTo: null, storyPoints: 1, state: 'New', statusGroup: 'Planned' },
        { adoId: 2, title: 'Approved B', assignedTo: null, storyPoints: 2, state: 'Approved', statusGroup: 'Planned' },
        { adoId: 3, title: 'Committed C', assignedTo: null, storyPoints: 3, state: 'Committed', statusGroup: 'Planned' },
      ],
    });

    const result = mapSprintStoriesResponse(response);

    expect(result[0].statusGroups).toHaveLength(1);
    expect(result[0].statusGroups[0].group).toBe('Planned');
    expect(result[0].statusGroups[0].stories).toHaveLength(3);
    expect(result[0].statusGroups[0].totalStoryPoints).toBe(6);
  });

  it('computes totalStoryPoints as sum of story points per group', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Active A', assignedTo: null, storyPoints: 5, state: 'Active', statusGroup: 'Active' },
        { adoId: 2, title: 'Active B', assignedTo: null, storyPoints: 5, state: 'Active', statusGroup: 'Active' },
        { adoId: 3, title: 'Active C', assignedTo: null, storyPoints: 5, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].totalStoryPoints).toBe(15);
  });

  it('treats null storyPoints as 0 when summing totalStoryPoints', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Estimated', assignedTo: null, storyPoints: 5, state: 'Active', statusGroup: 'Active' },
        { adoId: 2, title: 'Estimated 2', assignedTo: null, storyPoints: 3, state: 'Active', statusGroup: 'Active' },
        { adoId: 3, title: 'Unestimated', assignedTo: null, storyPoints: null, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].totalStoryPoints).toBe(8);
  });

  it('sets totalStoryPoints to 0 when all stories in group are unestimated', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Unestimated A', assignedTo: null, storyPoints: null, state: 'New', statusGroup: 'Planned' },
        { adoId: 2, title: 'Unestimated B', assignedTo: null, storyPoints: null, state: 'New', statusGroup: 'Planned' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].totalStoryPoints).toBe(0);
  });

  it('sets totalStoryPoints to single story points for one-story group', () => {
    const response = buildResponse({
      stories: [
        { adoId: 1, title: 'Solo', assignedTo: null, storyPoints: 8, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    expect(result[0].statusGroups[0].totalStoryPoints).toBe(8);
  });

  it('handles empty API response (no sprints)', () => {
    const response: SprintStoriesApiResponse = { sprints: [] };
    const result = mapSprintStoriesResponse(response);
    expect(result).toEqual([]);
  });

  it('preserves all StoryRowViewModel fields', () => {
    const response = buildResponse({
      stories: [
        { adoId: 42, title: 'Full Story', assignedTo: 'Bob Smith', storyPoints: 13, state: 'Active', statusGroup: 'Active' },
      ],
    });

    const result = mapSprintStoriesResponse(response);
    const row = result[0].statusGroups[0].stories[0];

    expect(row).toEqual({
      adoId: '#42',
      title: 'Full Story',
      assignedTo: 'Bob Smith',
      storyPoints: '13',
      state: 'Active',
      statusGroup: 'Active',
      adoUrl: `${ADO_BASE}/42`,
    });
  });
});
