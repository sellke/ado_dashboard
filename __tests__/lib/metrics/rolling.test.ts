import { calculateRollingAverages } from '@/lib/metrics/rolling';
import type { PriorSnapshot } from '@/lib/metrics/types';

// ============================================================================
// calculateRollingAverages
// ============================================================================

describe('calculateRollingAverages', () => {
  it('should compute arithmetic mean of 4 prior sprints', () => {
    const priors: PriorSnapshot[] = [
      { velocity: 20, overheadPercent: 10, predictability: 80, carryOverRate: 15 },
      { velocity: 22, overheadPercent: 12, predictability: 90, carryOverRate: 10 },
      { velocity: 18, overheadPercent: 8, predictability: 85, carryOverRate: 20 },
      { velocity: 24, overheadPercent: 14, predictability: 75, carryOverRate: 5 },
    ];
    const result = calculateRollingAverages(priors);

    expect(result.velocityAvg).toBe(21); // (20+22+18+24)/4
    expect(result.overheadPercentAvg).toBe(11); // (10+12+8+14)/4
    expect(result.predictabilityAvg).toBe(82.5); // (80+90+85+75)/4
    expect(result.carryOverRateAvg).toBe(12.5); // (15+10+20+5)/4
  });

  it('should handle fewer than 4 prior sprints', () => {
    const priors: PriorSnapshot[] = [
      { velocity: 20, overheadPercent: 10, predictability: 80, carryOverRate: 15 },
      { velocity: 30, overheadPercent: 20, predictability: 90, carryOverRate: 5 },
    ];
    const result = calculateRollingAverages(priors);

    expect(result.velocityAvg).toBe(25); // (20+30)/2
    expect(result.overheadPercentAvg).toBe(15);
    expect(result.predictabilityAvg).toBe(85);
    expect(result.carryOverRateAvg).toBe(10);
  });

  it('should return all nulls when no prior snapshots', () => {
    const result = calculateRollingAverages([]);

    expect(result.velocityAvg).toBeNull();
    expect(result.overheadPercentAvg).toBeNull();
    expect(result.predictabilityAvg).toBeNull();
    expect(result.carryOverRateAvg).toBeNull();
  });

  it('should skip null metrics when computing averages', () => {
    const priors: PriorSnapshot[] = [
      { velocity: 20, overheadPercent: null, predictability: 80, carryOverRate: null },
      { velocity: 30, overheadPercent: 10, predictability: null, carryOverRate: 20 },
      { velocity: null, overheadPercent: 20, predictability: 90, carryOverRate: null },
      { velocity: 10, overheadPercent: null, predictability: null, carryOverRate: 10 },
    ];
    const result = calculateRollingAverages(priors);

    expect(result.velocityAvg).toBe(20); // (20+30+10)/3
    expect(result.overheadPercentAvg).toBe(15); // (10+20)/2
    expect(result.predictabilityAvg).toBe(85); // (80+90)/2
    expect(result.carryOverRateAvg).toBe(15); // (20+10)/2
  });

  it('should return null for a metric when all snapshots have null for that metric', () => {
    const priors: PriorSnapshot[] = [
      { velocity: 20, overheadPercent: null, predictability: 80, carryOverRate: null },
      { velocity: 30, overheadPercent: null, predictability: 90, carryOverRate: null },
    ];
    const result = calculateRollingAverages(priors);

    expect(result.velocityAvg).toBe(25);
    expect(result.overheadPercentAvg).toBeNull();
    expect(result.predictabilityAvg).toBe(85);
    expect(result.carryOverRateAvg).toBeNull();
  });

  it('should handle single prior sprint', () => {
    const priors: PriorSnapshot[] = [
      { velocity: 15, overheadPercent: 25, predictability: 70, carryOverRate: 30 },
    ];
    const result = calculateRollingAverages(priors);

    expect(result.velocityAvg).toBe(15);
    expect(result.overheadPercentAvg).toBe(25);
    expect(result.predictabilityAvg).toBe(70);
    expect(result.carryOverRateAvg).toBe(30);
  });
});
