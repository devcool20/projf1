import {
  countReplies,
  generateTrafficThreads,
  generateStressTestThreads,
  createMassiveLikeScenario,
  simulateRaceCondition,
} from '@/lib/comms-test-utils';

describe('Comms traffic / load simulation', () => {
  it('generateTrafficThreads produces consistent reply counts', () => {
    const config = {
      threadCount: 20,
      repliesPerThread: { min: 5, max: 15 },
      nestingDepth: { min: 1, max: 4 },
      likeVariance: { min: 0, max: 20 },
    };
    const threads = generateTrafficThreads(config);
    expect(threads).toHaveLength(20);
    for (const t of threads) {
      expect(countReplies(t.replies)).toBe(t.comments);
      expect(t.likes).toBeGreaterThanOrEqual(0);
      expect(t.likes).toBeLessThanOrEqual(20);
    }
  });

  it('generateStressTestThreads scales to large lists quickly', () => {
    const start = performance.now();
    const n = 5000;
    const threads = generateStressTestThreads(n);
    const elapsed = performance.now() - start;
    expect(threads).toHaveLength(n);
    expect(elapsed).toBeLessThan(3000);
  });

  it('createMassiveLikeScenario + simulateRaceCondition handles burst traffic', () => {
    const { operations } = createMassiveLikeScenario(0, 10_000);
    const r = simulateRaceCondition(operations, 0);
    expect(r.operationsProcessed).toBe(10_000);
    expect(r.finalLikes).toBe(10_000);
    expect(r.conflicts).toBe(0);
  });

  it('rapid interleaved like/unlike converges without negative likes', () => {
    const ops = Array.from({ length: 2000 }, (_, i) => ({
      id: `op-${i}`,
      type: (i % 2 === 0 ? 'like' : 'unlike') as 'like' | 'unlike',
      targetId: 't',
      timestamp: i,
    }));
    const r = simulateRaceCondition(ops, 100);
    expect(r.finalLikes).toBeGreaterThanOrEqual(0);
    expect(r.operationsProcessed).toBe(2000);
  });
});
