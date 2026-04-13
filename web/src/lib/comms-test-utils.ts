import { CommReply, CommThread } from './types';
import { computeSignalScore, getSignalLabel } from './signal-score';

export { computeSignalScore, getSignalLabel };

export function countReplies(replies: CommReply[] | null | undefined): number {
  if (!replies) return 0;
  return replies.reduce((acc, reply) => acc + 1 + countReplies(reply.replies), 0);
}

export function updateReplyLikeTree(
  replies: CommReply[],
  replyId: string,
  delta: number
): CommReply[] {
  return replies.map((r) => {
    if (r.id === replyId) return { ...r, likes: Math.max(0, r.likes + delta) };
    if (!r.replies?.length) return r;
    return { ...r, replies: updateReplyLikeTree(r.replies, replyId, delta) };
  });
}

export function addReplyToTree(
  replies: CommReply[],
  parentId: string | null,
  newReply: CommReply
): CommReply[] {
  if (!parentId) return [...replies, newReply];
  return replies.map((r) => {
    if (r.id === parentId) return { ...r, replies: [...(r.replies || []), newReply] };
    if (!r.replies?.length) return r;
    return { ...r, replies: addReplyToTree(r.replies, parentId, newReply) };
  });
}

export function findReplyInTree(
  replies: CommReply[],
  replyId: string
): CommReply | null {
  for (const reply of replies) {
    if (reply.id === replyId) return reply;
    if (reply.replies?.length) {
      const found = findReplyInTree(reply.replies, replyId);
      if (found) return found;
    }
  }
  return null;
}

export function removeReplyFromTree(
  replies: CommReply[],
  replyId: string
): CommReply[] {
  return replies
    .filter(r => r.id !== replyId)
    .map(r => ({
      ...r,
      replies: r.replies ? removeReplyFromTree(r.replies, replyId) : []
    }));
}

export function getReplyDepth(
  replies: CommReply[],
  targetId: string,
  currentDepth = 0
): number {
  for (const reply of replies) {
    if (reply.id === targetId) return currentDepth;
    if (reply.replies?.length) {
      const depth = getReplyDepth(reply.replies, targetId, currentDepth + 1);
      if (depth >= 0) return depth;
    }
  }
  return -1;
}

export function flattenReplyTree(replies: CommReply[]): CommReply[] {
  const result: CommReply[] = [];
  const traverse = (nodes: CommReply[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.replies?.length) traverse(node.replies);
    }
  };
  traverse(replies);
  return result;
}

export function getMaxDepth(replies: CommReply[]): number {
  if (!replies.length) return 0;
  return 1 + Math.max(...replies.map(r => getMaxDepth(r.replies || [])));
}

export function sortThreadsByEngagement(threads: CommThread[]): CommThread[] {
  return [...threads].sort((a, b) => {
    const scoreA = computeSignalScore(a);
    const scoreB = computeSignalScore(b);
    return scoreB - scoreA;
  });
}

export function sortThreadsByRecency(threads: CommThread[]): CommThread[] {
  return [...threads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function filterThreadsByQuery(threads: CommThread[], query: string): CommThread[] {
  if (!query.trim()) return threads;
  const lowerQuery = query.toLowerCase();
  return threads.filter(
    thread =>
      thread.username.toLowerCase().includes(lowerQuery) ||
      thread.fullName.toLowerCase().includes(lowerQuery) ||
      thread.message.toLowerCase().includes(lowerQuery)
  );
}

export interface TestScenario<T> {
  name: string;
  input: T;
  expected: T | null;
  shouldThrow?: boolean;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface RobustnessTestResults {
  passed: number;
  failed: number;
  results: TestResult[];
}

export function runRobustnessTests<T>(
  scenarios: TestScenario<T>[],
  fn: (input: T) => T | null
): RobustnessTestResults {
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  for (const scenario of scenarios) {
    try {
      if (scenario.shouldThrow) {
        expect(() => fn(scenario.input)).toThrow();
        passed++;
        results.push({ name: scenario.name, passed: true });
      } else {
        const result = fn(scenario.input);
        expect(result).toEqual(scenario.expected);
        passed++;
        results.push({ name: scenario.name, passed: true });
      }
    } catch (error) {
      failed++;
      results.push({
        name: scenario.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return { passed, failed, results };
}

export interface TrafficConfig {
  threadCount: number;
  repliesPerThread: { min: number; max: number };
  nestingDepth: { min: number; max: number };
  likeVariance: { min: number; max: number };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateTrafficThreads(config: TrafficConfig): CommThread[] {
  const threads: CommThread[] = [];
  const baseTime = Date.now();
  for (let i = 0; i < config.threadCount; i++) {
    const replyCount = randomInt(config.repliesPerThread.min, config.repliesPerThread.max);
    const replies = generateNestedReplies(replyCount, config.nestingDepth, baseTime - i * 60000);
    threads.push({
      id: `thread-${i}-${crypto.randomUUID()}`,
      username: `Driver${i + 1}`,
      fullName: `F1 Driver ${i + 1}`,
      profileId: `profile-${i}`,
      message: `Race incident discussion #${i + 1} - Strategy analysis and team communications.`,
      imageUrl: i % 3 === 0 ? `https://example.com/image-${i}.jpg` : undefined,
      likes: randomInt(config.likeVariance.min, config.likeVariance.max),
      comments: countReplies(replies),
      createdAt: new Date(baseTime - i * 60000).toISOString(),
      replies,
    });
  }
  return threads;
}

function generateNestedReplies(
  count: number,
  depthConfig: { min: number; max: number },
  baseTime: number
): CommReply[] {
  const roots: CommReply[] = [];
  let remaining = count;

  const appendChildren = (parent: CommReply, depth: number): void => {
    if (remaining <= 0) return;
    const maxChildDepth = randomInt(depthConfig.min, depthConfig.max);
    const replyCount = Math.min(remaining, randomInt(1, 3));
    for (let i = 0; i < replyCount && remaining > 0; i++) {
      const id = `reply-${crypto.randomUUID()}`;
      const reply: CommReply = {
        id,
        profileId: `profile-${randomInt(1, 20)}`,
        username: `Driver${randomInt(1, 20)}`,
        fullName: `F1 Driver ${randomInt(1, 20)}`,
        message: `Reply message ${remaining} - nested at depth ${depth}`,
        likes: randomInt(0, 50),
        createdAt: new Date(baseTime - remaining * 10000).toISOString(),
        replies: [],
      };
      parent.replies.push(reply);
      remaining--;
      if (depth < maxChildDepth && remaining > 0) {
        appendChildren(reply, depth + 1);
      }
    }
  };

  while (remaining > 0) {
    const id = `reply-${crypto.randomUUID()}`;
    const root: CommReply = {
      id,
      profileId: `profile-${randomInt(1, 20)}`,
      username: `Driver${randomInt(1, 20)}`,
      fullName: `F1 Driver ${randomInt(1, 20)}`,
      message: `Reply message ${remaining} - root`,
      likes: randomInt(0, 50),
      createdAt: new Date(baseTime - remaining * 10000).toISOString(),
      replies: [],
    };
    roots.push(root);
    remaining--;
    const maxChildDepth = randomInt(depthConfig.min, depthConfig.max);
    if (maxChildDepth > 0 && remaining > 0) {
      appendChildren(root, 1);
    }
  }

  return roots;
}

export interface ConcurrentOperation {
  id: string;
  type: 'like' | 'unlike' | 'reply' | 'delete';
  targetId: string;
  timestamp: number;
}

export interface RaceConditionResult {
  finalLikes: number;
  operationsProcessed: number;
  conflicts: number;
}

export function simulateRaceCondition(
  operations: ConcurrentOperation[],
  initialLikes: number
): RaceConditionResult {
  let finalLikes = initialLikes;
  let conflicts = 0;
  const processed = new Set<string>();
  for (const op of operations) {
    if (processed.has(op.id)) {
      conflicts++;
      continue;
    }
    switch (op.type) {
      case 'like':
        finalLikes++;
        break;
      case 'unlike':
        finalLikes = Math.max(0, finalLikes - 1);
        break;
    }
    processed.add(op.id);
  }
  return {
    finalLikes: Math.max(0, finalLikes),
    operationsProcessed: processed.size,
    conflicts,
  };
}

export function generateStressTestThreads(count: number): CommThread[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `stress-thread-${i}`,
    username: `User${i}`,
    fullName: `Stress Test User ${i}`,
    profileId: `profile-${i}`,
    message: `Stress test message ${i}`.repeat(10),
    imageUrl: i % 5 === 0 ? `https://example.com/stress-${i}.jpg` : undefined,
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
    replies: [],
  }));
}

export function createEmptyThread(): CommThread {
  return {
    id: 'empty-thread',
    username: 'TestUser',
    fullName: 'Test User',
    profileId: 'profile-1',
    message: '',
    imageUrl: undefined,
    likes: 0,
    comments: 0,
    createdAt: new Date().toISOString(),
    replies: [],
  };
}

export function createDeeplyNestedReplies(depth: number): CommReply[] {
  if (depth <= 0) return [];
  const createLevel = (currentDepth: number, parentId: string): CommReply => ({
    id: `reply-depth-${currentDepth}-${parentId}`,
    profileId: `profile-${currentDepth}`,
    username: `Driver${currentDepth}`,
    fullName: `F1 Driver at depth ${currentDepth}`,
    message: `Message at depth ${currentDepth}`,
    likes: currentDepth * 5,
    createdAt: new Date().toISOString(),
    replies: currentDepth > 0 ? [createLevel(currentDepth - 1, `reply-depth-${currentDepth - 1}-${parentId}`)] : [],
  });
  return [createLevel(depth - 1, 'root')];
}

export function createMassiveLikeScenario(baseLikes: number, increment: number): {
  thread: CommThread;
  operations: ConcurrentOperation[];
} {
  const threadId = 'like-test-thread';
  const operations: ConcurrentOperation[] = [];
  for (let i = 0; i < increment; i++) {
    operations.push({
      id: `like-${i}`,
      type: 'like',
      targetId: threadId,
      timestamp: Date.now() + i,
    });
  }
  const thread: CommThread = {
    id: threadId,
    username: 'LikeTest',
    fullName: 'Like Test User',
    profileId: 'profile-likes',
    message: 'Testing massive likes',
    likes: baseLikes,
    comments: 0,
    createdAt: new Date().toISOString(),
    replies: [],
  };
  return { thread, operations };
}