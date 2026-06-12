/**
 * @jest-environment node
 *
 * Unit tests for Story 2: iteration ingestion and sprint resolution.
 * - 5-sprint selection logic
 * - Sprint upsert by iteration path
 * - Current-sprint identification
 */

import {
  selectRollingSprints,
  upsertSprintsFromIterations,
  type AdoIteration,
} from '@/lib/sync/iterations';
import { INGEST_SPRINT_DEPTH, ROLLING_WINDOW_DEPTH, VISIBLE_SPRINT_TABS } from '@/lib/sync/window';
import { cleanupTestData, prisma } from '../../prisma/helpers';

describe('selectRollingSprints with visible tab depth', () => {
  const base = 'Project\\Team\\Iteration';

  it('should return exactly 5 sprints including current when enough iterations exist', () => {
    const iterations: AdoIteration[] = [
      {
        path: `${base}\\Sprint 1`,
        name: 'Sprint 1',
        startDate: new Date('2025-10-01'),
        finishDate: new Date('2025-10-14'),
      },
      {
        path: `${base}\\Sprint 2`,
        name: 'Sprint 2',
        startDate: new Date('2025-10-15'),
        finishDate: new Date('2025-10-28'),
      },
      {
        path: `${base}\\Sprint 3`,
        name: 'Sprint 3',
        startDate: new Date('2025-10-29'),
        finishDate: new Date('2025-11-11'),
        isCurrent: true,
      },
      {
        path: `${base}\\Sprint 4`,
        name: 'Sprint 4',
        startDate: new Date('2025-11-12'),
        finishDate: new Date('2025-11-25'),
      },
      {
        path: `${base}\\Sprint 5`,
        name: 'Sprint 5',
        startDate: new Date('2025-11-26'),
        finishDate: new Date('2025-12-09'),
      },
      {
        path: `${base}\\Sprint 6`,
        name: 'Sprint 6',
        startDate: new Date('2025-12-10'),
        finishDate: new Date('2025-12-23'),
      },
    ];

    const { sprints: result } = selectRollingSprints(iterations, VISIBLE_SPRINT_TABS);
    expect(result).toHaveLength(5);
    // Spec: sorted by startDate descending (most recent first)
    expect(result.map((r) => r.path)).toEqual([
      `${base}\\Sprint 5`,
      `${base}\\Sprint 4`,
      `${base}\\Sprint 3`,
      `${base}\\Sprint 2`,
      `${base}\\Sprint 1`,
    ]);
    expect(result.find((r) => r.isCurrent)).toEqual(
      expect.objectContaining({ path: `${base}\\Sprint 3` })
    );
  });

  it('should include current sprint in selection', () => {
    const iterations: AdoIteration[] = [
      {
        path: 'P\\S1',
        name: 'S1',
        startDate: new Date('2025-01-01'),
        finishDate: new Date('2025-01-14'),
      },
      {
        path: 'P\\S2',
        name: 'S2',
        startDate: new Date('2025-01-15'),
        finishDate: new Date('2025-01-28'),
        isCurrent: true,
      },
      {
        path: 'P\\S3',
        name: 'S3',
        startDate: new Date('2025-01-29'),
        finishDate: new Date('2025-02-11'),
      },
    ];

    const { sprints: result } = selectRollingSprints(iterations, VISIBLE_SPRINT_TABS);
    expect(result).toHaveLength(3);
    expect(result.some((r) => r.isCurrent)).toBe(true);
    // Descending: S3, S2, S1 — current S2 at index 1
    expect(result[1]).toMatchObject({ path: 'P\\S2', isCurrent: true });
  });

  it('should return empty when no iterations have dates', () => {
    const iterations: AdoIteration[] = [
      { path: 'P\\S1', name: 'S1' },
      { path: 'P\\S2', name: 'S2' },
    ];
    expect(selectRollingSprints(iterations, VISIBLE_SPRINT_TABS).sprints).toHaveLength(0);
  });

  it('should sort deterministically by startDate descending (most recent first)', () => {
    const iterations: AdoIteration[] = [
      {
        path: 'P\\S3',
        name: 'S3',
        startDate: new Date('2025-03-01'),
        finishDate: new Date('2025-03-14'),
      },
      {
        path: 'P\\S1',
        name: 'S1',
        startDate: new Date('2025-01-01'),
        finishDate: new Date('2025-01-14'),
      },
      {
        path: 'P\\S2',
        name: 'S2',
        startDate: new Date('2025-02-01'),
        finishDate: new Date('2025-02-14'),
        isCurrent: true,
      },
    ];

    const { sprints: result } = selectRollingSprints(iterations, VISIBLE_SPRINT_TABS);
    expect(result[0].path).toBe('P\\S3');
    expect(result[1].path).toBe('P\\S2');
    expect(result[2].path).toBe('P\\S1');
  });

  it('should use last past sprint as current when all dates are in past and isCurrent not set', () => {
    const iterations: AdoIteration[] = [
      {
        path: 'P\\S1',
        name: 'S1',
        startDate: new Date('2024-01-01'),
        finishDate: new Date('2024-01-14'),
      },
      {
        path: 'P\\S2',
        name: 'S2',
        startDate: new Date('2024-01-15'),
        finishDate: new Date('2024-01-28'),
      },
    ];

    const { sprints: result } = selectRollingSprints(iterations, VISIBLE_SPRINT_TABS);
    expect(result).toHaveLength(2);
    // Most recent first: S2 (Jan 15) then S1 (Jan 1)
    expect(result[0].path).toBe('P\\S2');
    expect(result[1].path).toBe('P\\S1');
  });

  it('should exclude future sprints (timeFrame=2) from selection', () => {
    const pastDate = new Date('2024-06-01');
    const futureDate = new Date('2030-01-01');
    const iterations: AdoIteration[] = [
      { path: 'P\\Past', name: 'Past', startDate: pastDate, finishDate: new Date('2024-06-14') },
      {
        path: 'P\\Future',
        name: 'Future',
        startDate: futureDate,
        finishDate: new Date('2030-01-14'),
      },
    ];

    const { sprints: result } = selectRollingSprints(iterations, VISIBLE_SPRINT_TABS);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('P\\Past');
  });
});

describe('selectRollingSprints with ingestion depth', () => {
  const base = 'Project\\Team\\Iteration';

  function makeIterations(count: number, currentNumber: number = count): AdoIteration[] {
    return Array.from({ length: count }, (_, index) => {
      const sprintNumber = index + 1;
      const startDay = 1 + index * 14;
      return {
        path: `${base}\\Sprint ${sprintNumber}`,
        name: `Sprint ${sprintNumber}`,
        startDate: new Date(Date.UTC(2026, 0, startDay)),
        finishDate: new Date(Date.UTC(2026, 0, startDay + 13)),
        isCurrent: sprintNumber === currentNumber,
      };
    });
  }

  it('keeps the ingestion depth tied to visible tabs plus the rolling window', () => {
    expect(INGEST_SPRINT_DEPTH).toBe(VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH - 1);
    expect(INGEST_SPRINT_DEPTH).toBe(9);
  });

  it('returns current plus eight prior sprints when nine are available', () => {
    const { sprints, currentSprint } = selectRollingSprints(
      makeIterations(9),
      INGEST_SPRINT_DEPTH
    );

    expect(sprints).toHaveLength(INGEST_SPRINT_DEPTH);
    expect(currentSprint?.path).toBe(`${base}\\Sprint 9`);
    expect(sprints.map((sprint) => sprint.path)).toEqual([
      `${base}\\Sprint 9`,
      `${base}\\Sprint 8`,
      `${base}\\Sprint 7`,
      `${base}\\Sprint 6`,
      `${base}\\Sprint 5`,
      `${base}\\Sprint 4`,
      `${base}\\Sprint 3`,
      `${base}\\Sprint 2`,
      `${base}\\Sprint 1`,
    ]);
  });

  it.each([5, 7])('truncates to all %i available sprints without padding', (count) => {
    const { sprints } = selectRollingSprints(makeIterations(count), INGEST_SPRINT_DEPTH);

    expect(sprints).toHaveLength(count);
    expect(sprints.map((sprint) => sprint.path)).toEqual(
      Array.from({ length: count }, (_, index) => `${base}\\Sprint ${count - index}`)
    );
  });

  it('returns an empty selection for empty input', () => {
    expect(selectRollingSprints([], INGEST_SPRINT_DEPTH)).toEqual({
      sprints: [],
      currentSprint: null,
    });
  });

  it('excludes future sprints from the ingestion selection', () => {
    const iterations = [
      ...makeIterations(9),
      {
        path: `${base}\\Sprint Future`,
        name: 'Sprint Future',
        startDate: new Date('2030-01-01T00:00:00Z'),
        finishDate: new Date('2030-01-14T00:00:00Z'),
      },
    ];

    const { sprints } = selectRollingSprints(iterations, INGEST_SPRINT_DEPTH);

    expect(sprints).toHaveLength(INGEST_SPRINT_DEPTH);
    expect(sprints.some((sprint) => sprint.path?.endsWith('Future'))).toBe(false);
  });
});

describe('upsertSprintsFromIterations', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create sprints when none exist', async () => {
    const iterations: AdoIteration[] = [
      {
        path: 'Project\\Iteration\\Sprint 1',
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        finishDate: new Date('2026-01-14'),
      },
      {
        path: 'Project\\Iteration\\Sprint 2',
        name: 'Sprint 2',
        startDate: new Date('2026-01-15'),
        finishDate: new Date('2026-01-28'),
        isCurrent: true,
      },
    ];

    const result = await upsertSprintsFromIterations(iterations, 'Project\\Iteration\\Sprint 2');

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.sprintIds.size).toBe(2);
    expect(result.currentSprintId).toBe(result.sprintIds.get('Project\\Iteration\\Sprint 2'));
    expect(result.currentSprintPath).toBe('Project\\Iteration\\Sprint 2');

    const sprints = await prisma.sprint.findMany({ orderBy: { startDate: 'asc' } });
    expect(sprints).toHaveLength(2);
    expect(sprints[0]!.adoIterationPath).toBe('Project\\Iteration\\Sprint 1');
    expect(sprints[0]!.name).toBe('Sprint 1');
    expect(sprints[1]!.adoIterationPath).toBe('Project\\Iteration\\Sprint 2');
    expect(sprints[1]!.name).toBe('Sprint 2');
  });

  it('should update existing sprints by iteration path', async () => {
    const path = 'Project\\Iteration\\Sprint A';
    await prisma.sprint.create({
      data: {
        name: 'Old Name',
        adoIterationPath: path,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      },
    });

    const iterations: AdoIteration[] = [
      {
        path,
        name: 'New Name from ADO',
        startDate: new Date('2025-01-05'),
        finishDate: new Date('2025-01-18'),
      },
    ];

    const result = await upsertSprintsFromIterations(iterations, path);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.currentSprintId).not.toBeNull();

    const sprint = await prisma.sprint.findUnique({
      where: { adoIterationPath: path },
    });
    expect(sprint).not.toBeNull();
    expect(sprint!.name).toBe('New Name from ADO');
    expect(sprint!.startDate).toEqual(new Date('2025-01-05'));
    expect(sprint!.endDate).toEqual(new Date('2025-01-18'));
  });

  it('should handle seed naming mismatch: match by path, update name from ADO', async () => {
    const path = 'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Q1 FY27\\Sprint 1';
    await prisma.sprint.create({
      data: {
        name: 'Sprint 1 Q1 FY27',
        adoIterationPath: path,
        startDate: new Date('2026-04-27'),
        endDate: new Date('2026-05-08'),
      },
    });

    const iterations: AdoIteration[] = [
      {
        path,
        name: 'Sprint 27.1',
        startDate: new Date('2026-04-27'),
        finishDate: new Date('2026-05-08'),
      },
    ];

    const result = await upsertSprintsFromIterations(iterations, path);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);

    const sprint = await prisma.sprint.findUnique({
      where: { adoIterationPath: path },
    });
    expect(sprint!.name).toBe('Sprint 27.1');
  });

  it('should return currentSprintId and currentSprintPath for downstream exclusion', async () => {
    const iterations: AdoIteration[] = [
      {
        path: 'P\\S1',
        name: 'S1',
        startDate: new Date('2026-01-01'),
        finishDate: new Date('2026-01-14'),
      },
      {
        path: 'P\\S2',
        name: 'S2',
        startDate: new Date('2026-01-15'),
        finishDate: new Date('2026-01-28'),
      },
    ];

    const result = await upsertSprintsFromIterations(iterations, 'P\\S2');

    expect(result.currentSprintId).toBeTruthy();
    expect(result.currentSprintPath).toBe('P\\S2');
    expect(result.sprintIds.get('P\\S2')).toBe(result.currentSprintId);
  });

  it('should return null currentSprintId when currentPath not in selected iterations', async () => {
    const iterations: AdoIteration[] = [
      {
        path: 'P\\S1',
        name: 'S1',
        startDate: new Date('2026-01-01'),
        finishDate: new Date('2026-01-14'),
      },
    ];

    const result = await upsertSprintsFromIterations(iterations, 'P\\Other');

    expect(result.currentSprintId).toBeNull();
    expect(result.currentSprintPath).toBe('P\\Other');
  });

  it('should skip iterations without path or dates', async () => {
    const iterations: AdoIteration[] = [
      {
        path: '',
        name: 'Bad',
        startDate: new Date('2026-01-01'),
        finishDate: new Date('2026-01-14'),
      },
      { path: 'P\\S1', name: 'S1' },
      {
        path: 'P\\S2',
        name: 'S2',
        startDate: new Date('2026-01-01'),
        finishDate: new Date('2026-01-14'),
      },
    ];

    const result = await upsertSprintsFromIterations(iterations, null);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.sprintIds.size).toBe(1);
  });

  it('should be idempotent across multiple runs', async () => {
    const iterations: AdoIteration[] = [
      {
        path: 'Project\\Iteration\\Sprint Idempotent',
        name: 'Sprint Idempotent',
        startDate: new Date('2026-02-01'),
        finishDate: new Date('2026-02-14'),
      },
    ];

    const r1 = await upsertSprintsFromIterations(iterations, null);
    const r2 = await upsertSprintsFromIterations(iterations, null);

    expect(r1.created).toBe(1);
    expect(r1.updated).toBe(0);
    expect(r2.created).toBe(0);
    expect(r2.updated).toBe(1);

    const count = await prisma.sprint.count({
      where: { adoIterationPath: 'Project\\Iteration\\Sprint Idempotent' },
    });
    expect(count).toBe(1);
  });
});
