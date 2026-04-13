import { CommReply } from '@/lib/types';
import {
  countReplies,
  updateReplyLikeTree,
  addReplyToTree,
  findReplyInTree,
  removeReplyFromTree,
  getReplyDepth,
  flattenReplyTree,
  getMaxDepth,
} from '@/lib/comms-test-utils';

describe('Comms tree manipulation', () => {
  describe('countReplies', () => {
    it('returns 0 for null, undefined, or empty', () => {
      expect(countReplies(null)).toBe(0);
      expect(countReplies(undefined)).toBe(0);
      expect(countReplies([])).toBe(0);
    });

    it('counts flat and nested replies', () => {
      const replies: CommReply[] = [
        {
          id: 'r1',
          profileId: 'p1',
          username: 'u1',
          fullName: 'U1',
          message: 'm1',
          likes: 0,
          createdAt: '',
          replies: [
            { id: 'r2', profileId: 'p2', username: 'u2', fullName: 'U2', message: 'm2', likes: 0, createdAt: '', replies: [] },
            {
              id: 'r3',
              profileId: 'p3',
              username: 'u3',
              fullName: 'U3',
              message: 'm3',
              likes: 0,
              createdAt: '',
              replies: [
                { id: 'r4', profileId: 'p4', username: 'u4', fullName: 'U4', message: 'm4', likes: 0, createdAt: '', replies: [] },
              ],
            },
          ],
        },
      ];
      expect(countReplies(replies)).toBe(4);
    });

    it('handles a 50-level chain without stack issues', () => {
      let nested: CommReply[] = [];
      for (let i = 0; i < 50; i++) {
        nested = [
          {
            id: `r${i}`,
            profileId: `p${i}`,
            username: `u${i}`,
            fullName: `User ${i}`,
            message: `Message ${i}`,
            likes: i,
            createdAt: new Date().toISOString(),
            replies: nested,
          },
        ];
      }
      expect(countReplies(nested)).toBe(50);
    });
  });

  describe('updateReplyLikeTree', () => {
    it('updates nested likes and clamps at zero', () => {
      const replies: CommReply[] = [
        {
          id: 'r1',
          profileId: 'p1',
          username: 'u1',
          fullName: 'U1',
          message: 'm1',
          likes: 0,
          createdAt: '',
          replies: [
            { id: 'r2', profileId: 'p2', username: 'u2', fullName: 'U2', message: 'm2', likes: 10, createdAt: '', replies: [] },
          ],
        },
      ];
      expect(updateReplyLikeTree(replies, 'r2', 5)[0].replies?.[0].likes).toBe(15);
      expect(updateReplyLikeTree(replies, 'r2', -100)[0].replies?.[0].likes).toBe(0);
    });

    it('is a no-op for unknown ids', () => {
      const replies: CommReply[] = [
        { id: 'r1', profileId: 'p1', username: 'u1', fullName: 'U1', message: 'm1', likes: 5, createdAt: '', replies: [] },
      ];
      expect(updateReplyLikeTree(replies, 'missing', 1)).toEqual(replies);
    });
  });

  describe('addReplyToTree', () => {
    it('appends at root or under parent', () => {
      const base: CommReply[] = [
        { id: 'r1', profileId: 'p1', username: 'u1', fullName: 'U1', message: 'm1', likes: 0, createdAt: '', replies: [] },
      ];
      const child: CommReply = {
        id: 'r2',
        profileId: 'p2',
        username: 'u2',
        fullName: 'U2',
        message: 'm2',
        likes: 0,
        createdAt: '',
        replies: [],
      };
      expect(addReplyToTree(base, null, child)).toHaveLength(2);
      expect(addReplyToTree(base, 'r1', child)[0].replies?.[0].id).toBe('r2');
    });
  });

  describe('findReplyInTree / removeReplyFromTree / getReplyDepth / flattenReplyTree / getMaxDepth', () => {
    const tree: CommReply[] = [
      {
        id: 'a',
        profileId: 'p',
        username: 'u',
        fullName: 'U',
        message: 'm',
        likes: 0,
        createdAt: '',
        replies: [
          {
            id: 'b',
            profileId: 'p',
            username: 'u',
            fullName: 'U',
            message: 'm',
            likes: 0,
            createdAt: '',
            replies: [{ id: 'c', profileId: 'p', username: 'u', fullName: 'U', message: 'm', likes: 0, createdAt: '', replies: [] }],
          },
        ],
      },
    ];

    it('finds nested nodes', () => {
      expect(findReplyInTree(tree, 'c')?.id).toBe('c');
      expect(findReplyInTree(tree, 'x')).toBeNull();
    });

    it('removes without corrupting siblings', () => {
      const wide: CommReply[] = [
        {
          id: 'p1',
          profileId: 'p',
          username: 'u',
          fullName: 'U',
          message: 'm',
          likes: 0,
          createdAt: '',
          replies: [
            { id: 'c1', profileId: 'p', username: 'u', fullName: 'U', message: 'm', likes: 0, createdAt: '', replies: [] },
            { id: 'c2', profileId: 'p', username: 'u', fullName: 'U', message: 'm', likes: 0, createdAt: '', replies: [] },
          ],
        },
      ];
      const out = removeReplyFromTree(wide, 'c1');
      expect(out[0].replies?.map((r) => r.id)).toEqual(['c2']);
    });

    it('reports depth and max depth', () => {
      expect(getReplyDepth(tree, 'c')).toBe(2);
      expect(getReplyDepth(tree, 'missing')).toBe(-1);
      expect(getMaxDepth(tree)).toBe(3);
      expect(getMaxDepth([])).toBe(0);
    });

    it('flattens in preorder', () => {
      expect(flattenReplyTree(tree).map((r) => r.id)).toEqual(['a', 'b', 'c']);
    });
  });
});
