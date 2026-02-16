import { assignRag, assignVelocityRag } from '@/lib/metrics/rag';
import type { ThresholdConfigInput } from '@/lib/metrics/types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const thresholds: ThresholdConfigInput[] = [
  {
    metricName: 'sprintPredictability',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
  },
  { metricName: 'carryOverRate', greenMin: 0, greenMax: 10, amberMin: 10.01, amberMax: 25 },
  { metricName: 'overheadPercent', greenMin: 0, greenMax: 30, amberMin: 30.01, amberMax: 45 },
];

// ============================================================================
// assignRag (threshold-based)
// ============================================================================

describe('assignRag', () => {
  it('should return Green when value is in green range', () => {
    expect(assignRag(90, 'sprintPredictability', thresholds)).toBe('Green');
    expect(assignRag(80, 'sprintPredictability', thresholds)).toBe('Green');
    expect(assignRag(100, 'sprintPredictability', thresholds)).toBe('Green');
  });

  it('should return Amber when value is in amber range', () => {
    expect(assignRag(70, 'sprintPredictability', thresholds)).toBe('Amber');
    expect(assignRag(60, 'sprintPredictability', thresholds)).toBe('Amber');
    expect(assignRag(79.99, 'sprintPredictability', thresholds)).toBe('Amber');
  });

  it('should return Red when value is outside green and amber ranges', () => {
    expect(assignRag(50, 'sprintPredictability', thresholds)).toBe('Red');
    expect(assignRag(0, 'sprintPredictability', thresholds)).toBe('Red');
    expect(assignRag(59.99, 'sprintPredictability', thresholds)).toBe('Red');
  });

  it('should return null when value is null', () => {
    expect(assignRag(null, 'sprintPredictability', thresholds)).toBeNull();
  });

  it('should return null when metric config is not found', () => {
    expect(assignRag(90, 'nonExistentMetric', thresholds)).toBeNull();
  });

  it('should work correctly for carryOverRate thresholds', () => {
    expect(assignRag(5, 'carryOverRate', thresholds)).toBe('Green');
    expect(assignRag(15, 'carryOverRate', thresholds)).toBe('Amber');
    expect(assignRag(30, 'carryOverRate', thresholds)).toBe('Red');
  });

  it('should work correctly for overheadPercent thresholds', () => {
    expect(assignRag(20, 'overheadPercent', thresholds)).toBe('Green');
    expect(assignRag(35, 'overheadPercent', thresholds)).toBe('Amber');
    expect(assignRag(50, 'overheadPercent', thresholds)).toBe('Red');
  });

  it('should return null when thresholds array is empty', () => {
    expect(assignRag(90, 'sprintPredictability', [])).toBeNull();
  });
});

// ============================================================================
// assignVelocityRag (trend-based)
// ============================================================================

describe('assignVelocityRag', () => {
  it('should return Green when velocity >= rolling average', () => {
    expect(assignVelocityRag(20, 20)).toBe('Green');
    expect(assignVelocityRag(25, 20)).toBe('Green');
  });

  it('should return Amber when velocity is 70-99% of rolling average', () => {
    expect(assignVelocityRag(15, 20)).toBe('Amber'); // 75%
    expect(assignVelocityRag(14, 20)).toBe('Amber'); // 70%
  });

  it('should return Red when velocity < 70% of rolling average', () => {
    expect(assignVelocityRag(10, 20)).toBe('Red'); // 50%
    expect(assignVelocityRag(13.9, 20)).toBe('Red'); // 69.5%
    expect(assignVelocityRag(0, 20)).toBe('Red'); // 0%
  });

  it('should return null when velocity is null', () => {
    expect(assignVelocityRag(null, 20)).toBeNull();
  });

  it('should return null when rolling average is null', () => {
    expect(assignVelocityRag(20, null)).toBeNull();
  });

  it('should return null when both are null', () => {
    expect(assignVelocityRag(null, null)).toBeNull();
  });

  it('should return Green when rolling average is 0 and velocity > 0', () => {
    expect(assignVelocityRag(10, 0)).toBe('Green');
  });

  it('should return null when rolling average is 0 and velocity is 0', () => {
    expect(assignVelocityRag(0, 0)).toBeNull();
  });

  it('should handle exact boundary at 70%', () => {
    // ratio = 14/20 = 0.7 → should be Amber (>= 0.7)
    expect(assignVelocityRag(14, 20)).toBe('Amber');
  });

  it('should handle exact boundary at 100%', () => {
    // ratio = 20/20 = 1.0 → should be Green (>= 1.0)
    expect(assignVelocityRag(20, 20)).toBe('Green');
  });
});
