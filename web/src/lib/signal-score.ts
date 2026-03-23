import type { CommReply, CommThread } from "./types";

function maxReplyDepth(replies: CommReply[], current = 0): number {
  if (replies.length === 0) return current;
  return Math.max(...replies.map((r) => maxReplyDepth(r.replies, current + 1)));
}

function totalLikesInReplies(replies: CommReply[]): number {
  return replies.reduce((sum, r) => sum + r.likes + totalLikesInReplies(r.replies), 0);
}

function totalReplyCount(replies: CommReply[]): number {
  return replies.reduce((sum, r) => sum + 1 + totalReplyCount(r.replies), 0);
}

/**
 * Signal Score (0–100) derived from:
 * - Thread likes (weight 0.35)
 * - Total reply count (weight 0.25)
 * - Max reply depth — deeper = higher quality discussion (weight 0.20)
 * - Reply likes — engagement within replies (weight 0.20)
 *
 * Each component is normalized against soft-cap thresholds so the score
 * stays in 0–100 range without needing a global max.
 */
export function computeSignalScore(thread: CommThread): number {
  const likes = Math.min(thread.likes / 400, 1) * 35;
  const replies = Math.min(totalReplyCount(thread.replies) / 30, 1) * 25;
  const depth = Math.min(maxReplyDepth(thread.replies) / 5, 1) * 20;
  const replyLikes = Math.min(totalLikesInReplies(thread.replies) / 100, 1) * 20;

  return Math.round(likes + replies + depth + replyLikes);
}

export function getSignalLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "ELITE", color: "#7ef6ee" };
  if (score >= 50) return { label: "STRONG", color: "#ff9b48" };
  if (score >= 25) return { label: "RISING", color: "#ff725d" };
  return { label: "NEW", color: "#adaaad" };
}
