/**
 * @jest-environment node
 */

import { CeremonyType } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('Transcript model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helpers to create prerequisite records
  async function createSprint(overrides: Record<string, unknown> = {}) {
    return prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
        ...overrides,
      },
    });
  }

  async function createWorkstream(overrides: Record<string, unknown> = {}) {
    return prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
        ...overrides,
      },
    });
  }

  function validTranscriptData(sprintId: string, overrides: Record<string, unknown> = {}) {
    return {
      fileName: 'standup-2026-01-05.vtt',
      ceremonyType: 'Standup' as CeremonyType,
      ceremonyDate: new Date('2026-01-05'),
      sprintId,
      rawContent: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello team...',
      ...overrides,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // AC1: Basic creation, CUID ID, timestamps, FK relationships
  // ──────────────────────────────────────────────────────────────

  it('should create a Transcript with required fields', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    expect(transcript.fileName).toBe('standup-2026-01-05.vtt');
    expect(transcript.ceremonyType).toBe('Standup');
    expect(transcript.ceremonyDate).toEqual(new Date('2026-01-05'));
    expect(transcript.sprintId).toBe(sprint.id);
    expect(transcript.rawContent).toBe('WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello team...');
    expect(transcript.workstreamId).toBeNull();
    expect(transcript.processedAt).toBeNull();
  });

  it('should auto-generate a CUID ID', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    expect(transcript.id).toBeDefined();
    expect(typeof transcript.id).toBe('string');
    expect(transcript.id.length).toBeGreaterThan(0);
  });

  it('should auto-set createdAt and updatedAt timestamps', async () => {
    const before = new Date();
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    const after = new Date();

    expect(transcript.createdAt).toBeInstanceOf(Date);
    expect(transcript.updatedAt).toBeInstanceOf(Date);
    expect(transcript.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(transcript.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should be stored in the transcripts table (snake_case mapping)', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    const result = await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM transcripts WHERE id = ${transcript.id}`;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(transcript.id);
  });

  it('should have foreign key relationship to Sprint', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    expect(transcript.sprintId).toBe(sprint.id);

    // Navigate relation
    const fetched = await prisma.transcript.findUnique({
      where: { id: transcript.id },
      include: { sprint: true },
    });

    expect(fetched!.sprint.id).toBe(sprint.id);
    expect(fetched!.sprint.name).toBe('Sprint 1');
  });

  it('should have optional foreign key relationship to Workstream', async () => {
    const sprint = await createSprint();
    const workstream = await createWorkstream();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id, {
        workstreamId: workstream.id,
      }),
    });

    expect(transcript.workstreamId).toBe(workstream.id);

    // Navigate relation
    const fetched = await prisma.transcript.findUnique({
      where: { id: transcript.id },
      include: { workstream: true },
    });

    expect(fetched!.workstream).not.toBeNull();
    expect(fetched!.workstream!.id).toBe(workstream.id);
  });

  it('should cascade delete when Sprint is deleted', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    await prisma.sprint.delete({ where: { id: sprint.id } });

    const fetched = await prisma.transcript.findUnique({
      where: { id: transcript.id },
    });

    expect(fetched).toBeNull();
  });

  it('should set workstreamId to null when Workstream is deleted (SetNull)', async () => {
    const sprint = await createSprint();
    const workstream = await createWorkstream();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id, {
        workstreamId: workstream.id,
      }),
    });

    await prisma.workstream.delete({ where: { id: workstream.id } });

    const fetched = await prisma.transcript.findUnique({
      where: { id: transcript.id },
    });

    expect(fetched).not.toBeNull();
    expect(fetched!.workstreamId).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // AC2: CeremonyType enum constraints
  // ──────────────────────────────────────────────────────────────

  const validCeremonyTypes: CeremonyType[] = [
    'Standup',
    'ScrumOfScrums',
    'SprintPlanning',
    'BacklogRefinement',
  ];

  it.each(validCeremonyTypes)('should accept CeremonyType enum value: %s', async (type) => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id, { ceremonyType: type }),
    });

    expect(transcript.ceremonyType).toBe(type);
  });

  it('should reject invalid CeremonyType enum value', async () => {
    const sprint = await createSprint();

    await expect(
      prisma.transcript.create({
        data: validTranscriptData(sprint.id, {
          ceremonyType: 'InvalidType' as CeremonyType,
        }),
      })
    ).rejects.toThrow();
  });

  it('should explicitly reject Retro as a CeremonyType to preserve retro confidentiality', async () => {
    const sprint = await createSprint();

    await expect(
      prisma.transcript.create({
        data: validTranscriptData(sprint.id, {
          ceremonyType: 'Retro' as CeremonyType,
        }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // AC3: processedAt nullable tracking
  // ──────────────────────────────────────────────────────────────

  it('should default processedAt to null when not provided', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    expect(transcript.processedAt).toBeNull();
  });

  it('should accept processedAt when explicitly set', async () => {
    const sprint = await createSprint();
    const processedAt = new Date('2026-01-06T10:00:00Z');

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id, { processedAt }),
    });

    expect(transcript.processedAt).toEqual(processedAt);
  });

  it('should allow updating processedAt from null to a date (tracking LLM processing)', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    expect(transcript.processedAt).toBeNull();

    const processedAt = new Date();
    const updated = await prisma.transcript.update({
      where: { id: transcript.id },
      data: { processedAt },
    });

    expect(updated.processedAt).toEqual(processedAt);
  });

  // ──────────────────────────────────────────────────────────────
  // Nullable fields
  // ──────────────────────────────────────────────────────────────

  it('should allow null workstreamId', async () => {
    const sprint = await createSprint();

    const transcript = await prisma.transcript.create({
      data: validTranscriptData(sprint.id),
    });

    expect(transcript.workstreamId).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // Required fields validation
  // ──────────────────────────────────────────────────────────────

  it('should require fileName field', async () => {
    const sprint = await createSprint();

    await expect(
      prisma.transcript.create({
        data: validTranscriptData(sprint.id, { fileName: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require ceremonyType field', async () => {
    const sprint = await createSprint();

    await expect(
      prisma.transcript.create({
        data: validTranscriptData(sprint.id, { ceremonyType: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require ceremonyDate field', async () => {
    const sprint = await createSprint();

    await expect(
      prisma.transcript.create({
        data: validTranscriptData(sprint.id, { ceremonyDate: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require rawContent field', async () => {
    const sprint = await createSprint();

    await expect(
      prisma.transcript.create({
        data: validTranscriptData(sprint.id, { rawContent: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require sprintId field', async () => {
    await expect(
      prisma.transcript.create({
        data: validTranscriptData('', { sprintId: undefined }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // Sprint relation: navigate from Sprint -> Transcripts
  // ──────────────────────────────────────────────────────────────

  it('should allow navigating from Sprint to Transcripts', async () => {
    const sprint = await createSprint();

    await prisma.transcript.create({
      data: validTranscriptData(sprint.id, {
        fileName: 'standup-day1.vtt',
      }),
    });
    await prisma.transcript.create({
      data: validTranscriptData(sprint.id, {
        fileName: 'standup-day2.vtt',
        ceremonyDate: new Date('2026-01-06'),
      }),
    });

    const sprintWithTranscripts = await prisma.sprint.findUnique({
      where: { id: sprint.id },
      include: { transcripts: true },
    });

    expect(sprintWithTranscripts!.transcripts).toHaveLength(2);
  });

  // ──────────────────────────────────────────────────────────────
  // Workstream relation: navigate from Workstream -> Transcripts
  // ──────────────────────────────────────────────────────────────

  it('should allow navigating from Workstream to Transcripts', async () => {
    const sprint = await createSprint();
    const workstream = await createWorkstream();

    await prisma.transcript.create({
      data: validTranscriptData(sprint.id, {
        workstreamId: workstream.id,
      }),
    });

    const workstreamWithTranscripts = await prisma.workstream.findUnique({
      where: { id: workstream.id },
      include: { transcripts: true },
    });

    expect(workstreamWithTranscripts!.transcripts).toHaveLength(1);
  });
});
