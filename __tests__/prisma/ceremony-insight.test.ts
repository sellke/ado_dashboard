/**
 * @jest-environment node
 */

import { CeremonyType, InsightType, Severity } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('CeremonyInsight model', () => {
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

  async function createTranscript(sprintId: string, overrides: Record<string, unknown> = {}) {
    return prisma.transcript.create({
      data: {
        fileName: 'standup-2026-01-05.vtt',
        ceremonyType: 'Standup' as CeremonyType,
        ceremonyDate: new Date('2026-01-05'),
        sprintId,
        rawContent: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello team...',
        ...overrides,
      },
    });
  }

  function validInsightData(transcriptId: string, overrides: Record<string, unknown> = {}) {
    return {
      transcriptId,
      insightType: 'Risk' as InsightType,
      severity: 'High' as Severity,
      content: 'Dependency on external API may delay delivery',
      ...overrides,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // AC4: Basic creation, CUID ID, timestamps, FK relationships
  // ──────────────────────────────────────────────────────────────

  it('should create a CeremonyInsight with required fields', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    expect(insight.transcriptId).toBe(transcript.id);
    expect(insight.insightType).toBe('Risk');
    expect(insight.severity).toBe('High');
    expect(insight.content).toBe('Dependency on external API may delay delivery');
    expect(insight.relatedWorkstreamId).toBeNull();
  });

  it('should auto-generate a CUID ID', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    expect(insight.id).toBeDefined();
    expect(typeof insight.id).toBe('string');
    expect(insight.id.length).toBeGreaterThan(0);
  });

  it('should auto-set createdAt timestamp', async () => {
    const before = new Date();
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    const after = new Date();

    expect(insight.createdAt).toBeInstanceOf(Date);
    expect(insight.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(insight.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should be stored in the ceremony_insights table (snake_case mapping)', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    const result = await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM ceremony_insights WHERE id = ${insight.id}`;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(insight.id);
  });

  it('should have foreign key relationship to Transcript', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    expect(insight.transcriptId).toBe(transcript.id);

    // Navigate relation
    const fetched = await prisma.ceremonyInsight.findUnique({
      where: { id: insight.id },
      include: { transcript: true },
    });

    expect(fetched!.transcript.id).toBe(transcript.id);
    expect(fetched!.transcript.fileName).toBe('standup-2026-01-05.vtt');
  });

  it('should have optional foreign key relationship to Workstream (relatedWorkstreamId)', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);
    const workstream = await createWorkstream();

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        relatedWorkstreamId: workstream.id,
      }),
    });

    expect(insight.relatedWorkstreamId).toBe(workstream.id);

    // Navigate relation
    const fetched = await prisma.ceremonyInsight.findUnique({
      where: { id: insight.id },
      include: { relatedWorkstream: true },
    });

    expect(fetched!.relatedWorkstream).not.toBeNull();
    expect(fetched!.relatedWorkstream!.id).toBe(workstream.id);
  });

  it('should cascade delete when Transcript is deleted', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    await prisma.transcript.delete({ where: { id: transcript.id } });

    const fetched = await prisma.ceremonyInsight.findUnique({
      where: { id: insight.id },
    });

    expect(fetched).toBeNull();
  });

  it('should set relatedWorkstreamId to null when Workstream is deleted (SetNull)', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);
    const workstream = await createWorkstream();

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        relatedWorkstreamId: workstream.id,
      }),
    });

    await prisma.workstream.delete({ where: { id: workstream.id } });

    const fetched = await prisma.ceremonyInsight.findUnique({
      where: { id: insight.id },
    });

    expect(fetched).not.toBeNull();
    expect(fetched!.relatedWorkstreamId).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // AC4 (cont.): InsightType enum validation
  // ──────────────────────────────────────────────────────────────

  const allInsightTypes: InsightType[] = ['Risk', 'Blocker', 'Dependency', 'Theme', 'Sentiment'];

  it.each(allInsightTypes)('should accept InsightType enum value: %s', async (type) => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, { insightType: type }),
    });

    expect(insight.insightType).toBe(type);
  });

  it('should reject invalid InsightType enum value', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await expect(
      prisma.ceremonyInsight.create({
        data: validInsightData(transcript.id, {
          insightType: 'InvalidType' as InsightType,
        }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // AC4 (cont.): Severity enum validation
  // ──────────────────────────────────────────────────────────────

  const allSeverities: Severity[] = ['High', 'Medium', 'Low'];

  it.each(allSeverities)('should accept Severity enum value: %s', async (sev) => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, { severity: sev }),
    });

    expect(insight.severity).toBe(sev);
  });

  it('should reject invalid Severity enum value', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await expect(
      prisma.ceremonyInsight.create({
        data: validInsightData(transcript.id, {
          severity: 'Critical' as Severity,
        }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // Nullable fields
  // ──────────────────────────────────────────────────────────────

  it('should allow null relatedWorkstreamId', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    const insight = await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id),
    });

    expect(insight.relatedWorkstreamId).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // Required fields validation
  // ──────────────────────────────────────────────────────────────

  it('should require transcriptId field', async () => {
    await expect(
      prisma.ceremonyInsight.create({
        data: validInsightData('', { transcriptId: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require insightType field', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await expect(
      prisma.ceremonyInsight.create({
        data: validInsightData(transcript.id, { insightType: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require severity field', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await expect(
      prisma.ceremonyInsight.create({
        data: validInsightData(transcript.id, { severity: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require content field', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await expect(
      prisma.ceremonyInsight.create({
        data: validInsightData(transcript.id, { content: undefined }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // AC5: Navigate Transcript → CeremonyInsight and filter
  // ──────────────────────────────────────────────────────────────

  it('should allow navigating from Transcript to CeremonyInsights', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Risk',
        severity: 'High',
        content: 'Risk insight 1',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Blocker',
        severity: 'Medium',
        content: 'Blocker insight 1',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Theme',
        severity: 'Low',
        content: 'Theme insight 1',
      }),
    });

    const transcriptWithInsights = await prisma.transcript.findUnique({
      where: { id: transcript.id },
      include: { ceremonyInsights: true },
    });

    expect(transcriptWithInsights!.ceremonyInsights).toHaveLength(3);
  });

  it('should filter CeremonyInsights by insightType', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Risk',
        content: 'Risk 1',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Blocker',
        content: 'Blocker 1',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Risk',
        content: 'Risk 2',
      }),
    });

    const risks = await prisma.ceremonyInsight.findMany({
      where: {
        transcriptId: transcript.id,
        insightType: 'Risk',
      },
    });

    expect(risks).toHaveLength(2);
    risks.forEach((r) => expect(r.insightType).toBe('Risk'));
  });

  it('should filter CeremonyInsights by severity', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        severity: 'High',
        content: 'High sev 1',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        severity: 'Low',
        content: 'Low sev 1',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        severity: 'High',
        content: 'High sev 2',
      }),
    });

    const highSeverity = await prisma.ceremonyInsight.findMany({
      where: {
        transcriptId: transcript.id,
        severity: 'High',
      },
    });

    expect(highSeverity).toHaveLength(2);
    highSeverity.forEach((r) => expect(r.severity).toBe('High'));
  });

  it('should filter CeremonyInsights by both insightType and severity', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);

    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Risk',
        severity: 'High',
        content: 'High risk',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Risk',
        severity: 'Low',
        content: 'Low risk',
      }),
    });
    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        insightType: 'Blocker',
        severity: 'High',
        content: 'High blocker',
      }),
    });

    const highRisks = await prisma.ceremonyInsight.findMany({
      where: {
        transcriptId: transcript.id,
        insightType: 'Risk',
        severity: 'High',
      },
    });

    expect(highRisks).toHaveLength(1);
    expect(highRisks[0].content).toBe('High risk');
  });

  // ──────────────────────────────────────────────────────────────
  // Workstream relation: navigate from Workstream -> CeremonyInsights
  // ──────────────────────────────────────────────────────────────

  it('should allow navigating from Workstream to CeremonyInsights', async () => {
    const sprint = await createSprint();
    const transcript = await createTranscript(sprint.id);
    const workstream = await createWorkstream();

    await prisma.ceremonyInsight.create({
      data: validInsightData(transcript.id, {
        relatedWorkstreamId: workstream.id,
      }),
    });

    const workstreamWithInsights = await prisma.workstream.findUnique({
      where: { id: workstream.id },
      include: { ceremonyInsights: true },
    });

    expect(workstreamWithInsights!.ceremonyInsights).toHaveLength(1);
  });
});
