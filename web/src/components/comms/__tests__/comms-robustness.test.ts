import type { CommThread } from '@/lib/types';
import {
  filterThreadsByQuery,
  createEmptyThread,
  simulateRaceCondition,
  runRobustnessTests,
} from '@/lib/comms-test-utils';

describe('Comms robustness', () => {
  it('filterThreadsByQuery handles empty and special characters', () => {
    const threads: CommThread[] = [
      {
        id: '1',
        username: 'user_测试',
        fullName: 'Full 名前',
        profileId: 'p',
        message: 'emoji 🏎️ and <tag>',
        likes: 0,
        comments: 0,
        createdAt: '',
        replies: [],
      },
    ];
    expect(filterThreadsByQuery(threads, '测试')).toHaveLength(1);
    expect(filterThreadsByQuery(threads, '🏎️')).toHaveLength(1);
    expect(filterThreadsByQuery(threads, '<tag>')).toHaveLength(1);
    expect(filterThreadsByQuery(threads, '')).toEqual(threads);
  });

  it('createEmptyThread is stable for UI edge cases', () => {
    const t = createEmptyThread();
    expect(t.message).toBe('');
    expect(t.likes).toBe(0);
    expect(t.replies).toEqual([]);
  });

  it('simulateRaceCondition dedupes by operation id', () => {
    const ops = [
      { id: 'a', type: 'like' as const, targetId: 't', timestamp: 1 },
      { id: 'a', type: 'like' as const, targetId: 't', timestamp: 2 },
      { id: 'b', type: 'unlike' as const, targetId: 't', timestamp: 3 },
    ];
    const r = simulateRaceCondition(ops, 5);
    expect(r.operationsProcessed).toBe(2);
    expect(r.conflicts).toBe(1);
    expect(r.finalLikes).toBe(5);
  });

  it('runRobustnessTests aggregates pass/fail', () => {
    const out = runRobustnessTests(
      [
        { name: 'double', input: 2, expected: 4 },
        { name: 'triple', input: 3, expected: 9 },
      ],
      (n: number | null) => (n == null ? null : n * n),
    );
    expect(out.passed).toBe(2);
    expect(out.failed).toBe(0);
    const bad = runRobustnessTests([{ name: 'wrong', input: 2, expected: 5 }], (n: number) => n * n);
    expect(bad.failed).toBe(1);
  });
});
