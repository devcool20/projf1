import type { CommThread } from '@/lib/types';
import { computeSignalScore, getSignalLabel } from '@/lib/signal-score';
import {
  sortThreadsByEngagement,
  sortThreadsByRecency,
  filterThreadsByQuery,
} from '@/lib/comms-test-utils';

function thread(partial: Partial<CommThread> & Pick<CommThread, 'id'>): CommThread {
  return {
    username: 'u',
    fullName: 'User',
    profileId: 'pid',
    message: 'msg',
    likes: 0,
    comments: 0,
    createdAt: new Date().toISOString(),
    replies: [],
    ...partial,
  };
}

describe('Signal score (production)', () => {
  it('returns 0–100 and rises with likes, replies, depth, reply likes', () => {
    const empty = thread({ id: '1', likes: 0, replies: [] });
    const liked = thread({ id: '2', likes: 400, replies: [] });
    const withReplies = thread({
      id: '3',
      likes: 100,
      replies: [
        {
          id: 'r1',
          profileId: 'p',
          username: 'u',
          fullName: 'U',
          message: 'm',
          likes: 50,
          createdAt: '',
          replies: [
            {
              id: 'r2',
              profileId: 'p',
              username: 'u',
              fullName: 'U',
              message: 'm',
              likes: 50,
              createdAt: '',
              replies: [],
            },
          ],
        },
      ],
    });

    const s0 = computeSignalScore(empty);
    const s1 = computeSignalScore(liked);
    const s2 = computeSignalScore(withReplies);
    expect(s0).toBeGreaterThanOrEqual(0);
    expect(s0).toBeLessThanOrEqual(100);
    expect(s1).toBeGreaterThanOrEqual(s0);
    expect(s2).toBeGreaterThan(s0);
  });

  it('labels thresholds match signal-score', () => {
    expect(getSignalLabel(80).label).toBe('ELITE');
    expect(getSignalLabel(50).label).toBe('STRONG');
    expect(getSignalLabel(25).label).toBe('RISING');
    expect(getSignalLabel(0).label).toBe('NEW');
  });
});

describe('Comms list helpers', () => {
  const a = thread({ id: 'a', likes: 10, createdAt: '2026-01-02T00:00:00.000Z', message: 'alpha' });
  const b = thread({ id: 'b', likes: 400, createdAt: '2026-01-03T00:00:00.000Z', message: 'bravo' });
  const c = thread({ id: 'c', likes: 0, createdAt: '2026-01-01T00:00:00.000Z', message: 'charlie' });

  it('sortThreadsByEngagement orders by computeSignalScore', () => {
    const sorted = sortThreadsByEngagement([a, b, c]);
    expect(sorted[0].id).toBe('b');
  });

  it('sortThreadsByRecency is newest first', () => {
    expect(sortThreadsByRecency([a, b, c]).map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('filterThreadsByQuery matches username, full name, message (case-insensitive)', () => {
    const threads = [
      thread({ id: '1', username: 'Norris', fullName: 'Lando', message: 'Hi' }),
      thread({ id: '2', username: 'other', fullName: 'X', message: 'lando mention' }),
    ];
    expect(filterThreadsByQuery(threads, 'LANDO').map((t) => t.id)).toEqual(['1', '2']);
    expect(filterThreadsByQuery(threads, '  ')).toEqual(threads);
  });
});
