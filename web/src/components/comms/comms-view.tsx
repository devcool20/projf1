"use client";

import { commThreads as defaultThreads } from "@/lib/mock-data";
import { CommReply, CommThread } from "@/lib/types";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Signal } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Props = {
  query: string;
};

function countReplies(replies: CommReply[]): number {
  return replies.reduce((acc, reply) => acc + 1 + countReplies(reply.replies), 0);
}

function addReplyToTree(replies: CommReply[], parentReplyId: string, replyToInsert: CommReply): CommReply[] {
  return replies.map((reply) => {
    if (reply.id === parentReplyId) {
      return { ...reply, replies: [replyToInsert, ...reply.replies] };
    }

    return { ...reply, replies: addReplyToTree(reply.replies, parentReplyId, replyToInsert) };
  });
}

function likeReplyInTree(replies: CommReply[], replyId: string): CommReply[] {
  return replies.map((reply) => {
    if (reply.id === replyId) {
      return { ...reply, likes: reply.likes + 1 };
    }

    return { ...reply, replies: likeReplyInTree(reply.replies, replyId) };
  });
}

type ReplyNodeProps = {
  reply: CommReply;
  depth: number;
  onReplySubmit: (parentReplyId: string, message: string, imageUrl?: string) => void;
  onReplyLike: (replyId: string) => void;
};

function ReplyNode({ reply, depth, onReplySubmit, onReplyLike }: ReplyNodeProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState("");

  const submitReply = (event: FormEvent) => {
    event.preventDefault();

    if (!replyMessage.trim()) return;

    onReplySubmit(reply.id, replyMessage.trim(), replyImage.trim() || undefined);
    setReplyMessage("");
    setReplyImage("");
    setIsReplying(false);
  };

  return (
    <article className="mt-3 border-l border-outline-variant/40 pl-3" style={{ marginLeft: `${Math.min(depth, 6) * 14}px` }}>
      <div className="dashboard-panel p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-headline text-sm">{reply.username}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">{reply.fullName}</p>
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant">{reply.createdAt}</p>
        </div>
        <p className="mt-2 text-sm text-on-surface">{reply.message}</p>

        {reply.imageUrl && (
          <div className="relative mt-3 h-44 overflow-hidden rounded-sm border border-outline-variant/25">
            <Image src={reply.imageUrl} alt="Reply attachment" fill className="object-cover" />
          </div>
        )}

        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={() => onReplyLike(reply.id)}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary"
          >
            <Heart className="h-3.5 w-3.5" />
            {reply.likes}
          </button>
          <button
            onClick={() => setIsReplying((value) => !value)}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-secondary"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Reply
          </button>
        </div>
      </div>

      {isReplying && (
        <form onSubmit={submitReply} className="dashboard-panel mt-2 space-y-2 p-3">
          <textarea
            value={replyMessage}
            onChange={(event) => setReplyMessage(event.target.value)}
            className="w-full resize-none border border-outline-variant/30 bg-surface-container-low p-2 text-sm outline-none focus:border-secondary"
            placeholder="Write a nested reply..."
            rows={3}
          />
          <input
            value={replyImage}
            onChange={(event) => setReplyImage(event.target.value)}
            placeholder="Optional image URL"
            className="w-full border border-outline-variant/30 bg-surface-container-low p-2 text-xs outline-none focus:border-secondary"
          />
          <button type="submit" className="bg-primary px-3 py-1.5 font-headline text-xs font-bold tracking-[0.18em] text-black uppercase">
            Reply
          </button>
        </form>
      )}

      {reply.replies.map((nestedReply) => (
        <ReplyNode
          key={nestedReply.id}
          reply={nestedReply}
          depth={depth + 1}
          onReplySubmit={onReplySubmit}
          onReplyLike={onReplyLike}
        />
      ))}
    </article>
  );
}

export function CommsView({ query }: Props) {
  const [threads, setThreads] = useState<CommThread[]>(defaultThreads);
  const [selectedThreadId, setSelectedThreadId] = useState(defaultThreads[0]?.id ?? "");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const filtered = useMemo(() => {
    if (!query) return threads;
    return threads.filter((thread) =>
      `${thread.username} ${thread.fullName} ${thread.message}`.toLowerCase().includes(query),
    );
  }, [threads, query]);

  const selectedThread = useMemo(
    () => filtered.find((thread) => thread.id === selectedThreadId) ?? filtered[0],
    [filtered, selectedThreadId],
  );

  const addReply = (threadId: string, parentReplyId: string | null, message: string, imageUrl?: string) => {
    const now = new Date();
    const reply: CommReply = {
      id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
      username: "@you",
      fullName: "You",
      message,
      imageUrl,
      likes: 0,
      createdAt: now.toLocaleTimeString("en-GB", { hour12: false }),
      replies: [],
    };

    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== threadId) return thread;

        if (!parentReplyId) {
          return {
            ...thread,
            comments: thread.comments + 1,
            replies: [reply, ...thread.replies],
          };
        }

        return {
          ...thread,
          comments: thread.comments + 1,
          replies: addReplyToTree(thread.replies, parentReplyId, reply),
        };
      }),
    );
  };

  const submitThreadReply = (event: FormEvent) => {
    event.preventDefault();

    if (!selectedThread || !replyMessage.trim()) return;

    addReply(selectedThread.id, null, replyMessage.trim(), replyImage.trim() || undefined);
    setReplyMessage("");
    setReplyImage("");
  };

  const likeThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? { ...thread, likes: thread.likes + 1 } : thread)),
    );
  };

  const shareThread = async (thread: CommThread) => {
    try {
      await navigator.clipboard.writeText(`${thread.fullName} (${thread.username}): ${thread.message}`);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1200);
    } catch {
      setShareState("idle");
    }
  };

  const likeReply = (threadId: string, replyId: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId ? { ...thread, replies: likeReplyInTree(thread.replies, replyId) } : thread,
      ),
    );
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 xl:col-span-7">
        <div className="mb-4 flex items-end justify-between border-b border-primary/20 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">The Grid</p>
            <h2 className="font-headline text-3xl font-bold">Comms Threads</h2>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            {filtered.length} active comms
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const replyCount = countReplies(thread.replies);
            const score = computeSignalScore(thread);
            const signal = getSignalLabel(score);

            return (
              <motion.button
                key={thread.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`dashboard-panel text-left ${
                  isSelected ? "border-secondary/60 shadow-[0_0_16px_rgba(126,246,238,0.2)]" : "hover:border-primary/40"
                } p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-headline text-sm text-on-surface">{thread.username}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                      {thread.fullName}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-on-surface-variant">{thread.createdAt}</p>
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-on-surface/90">{thread.message}</p>

                {/* Signal Score Meter */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${score}%`, background: signal.color }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Signal className="h-3 w-3" style={{ color: signal.color }} />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: signal.color }}>
                      {signal.label}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {thread.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {Math.max(thread.comments, replyCount)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <aside className="thin-scrollbar col-span-12 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto xl:col-span-5">
        {!selectedThread ? (
          <div className="dashboard-panel p-5">
            <h3 className="font-headline text-xl">No matching thread</h3>
            <p className="mt-2 text-sm text-on-surface-variant">Try a different search term in HUD search.</p>
          </div>
        ) : (
          <div className="dashboard-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Thread Detail</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-headline text-base">{selectedThread.username}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                  {selectedThread.fullName}
                </p>
              </div>
              <p className="font-mono text-[10px] text-on-surface-variant">{selectedThread.createdAt}</p>
            </div>

            <p className="mt-4 text-base leading-relaxed text-on-surface">{selectedThread.message}</p>

            {/* Signal Score Detail */}
            {(() => {
              const detailScore = computeSignalScore(selectedThread);
              const detailSignal = getSignalLabel(detailScore);
              return (
                <div className="mt-4 rounded border border-outline-variant/20 bg-surface-container-low px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Signal className="h-4 w-4" style={{ color: detailSignal.color }} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                        Thread Signal Score
                      </span>
                    </div>
                    <span className="font-mono text-lg font-bold" style={{ color: detailSignal.color }}>
                      {detailScore}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${detailScore}%`, background: detailSignal.color }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: detailSignal.color }}>
                    {detailSignal.label} Signal — Derived from likes, reply depth, and engagement
                  </p>
                </div>
              );
            })()}

            {selectedThread.imageUrl && (
              <div className="relative mt-4 h-60 overflow-hidden rounded-sm border border-outline-variant/30">
                <Image src={selectedThread.imageUrl} alt="Thread attachment" fill className="object-cover" />
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => likeThread(selectedThread.id)}
                className="flex items-center gap-1.5 border border-outline-variant/30 px-3 py-2 text-xs text-on-surface-variant hover:border-primary/40 hover:text-primary"
              >
                <Heart className="h-3.5 w-3.5" />
                Like ({selectedThread.likes})
              </button>
              <button
                onClick={() => shareThread(selectedThread)}
                className="flex items-center gap-1.5 border border-outline-variant/30 px-3 py-2 text-xs text-on-surface-variant hover:border-secondary/40 hover:text-secondary"
              >
                <Share2 className="h-3.5 w-3.5" />
                {shareState === "copied" ? "Copied" : "Share"}
              </button>
            </div>

            <form onSubmit={submitThreadReply} className="mt-5 space-y-2 border-t border-outline-variant/25 pt-4">
              <textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                className="w-full resize-none border border-outline-variant/35 bg-surface-container-low p-3 font-mono text-xs tracking-[0.12em] text-on-surface outline-none focus:border-secondary"
                placeholder="ENTER RADIO TRANSCRIPT..."
                rows={4}
              />
              <input
                value={replyImage}
                onChange={(event) => setReplyImage(event.target.value)}
                className="w-full border border-outline-variant/35 bg-surface-container-low p-2 text-xs outline-none focus:border-secondary"
                placeholder="Optional image URL for this reply"
              />
              <button
                type="submit"
                className="w-full bg-primary px-4 py-3 font-headline text-sm font-bold tracking-[0.24em] text-black uppercase hover:scale-[1.02]"
              >
                TRANSMIT
              </button>
            </form>

            <div className="mt-5 border-t border-outline-variant/25 pt-4">
              <h4 className="font-headline text-lg">Replies</h4>
              {selectedThread.replies.length === 0 ? (
                <p className="mt-2 text-sm text-on-surface-variant">No replies yet. Start the discussion.</p>
              ) : (
                selectedThread.replies.map((reply) => (
                  <ReplyNode
                    key={reply.id}
                    reply={reply}
                    depth={0}
                    onReplySubmit={(parentReplyId, message, imageUrl) =>
                      addReply(selectedThread.id, parentReplyId, message, imageUrl)
                    }
                    onReplyLike={(replyId) => likeReply(selectedThread.id, replyId)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
