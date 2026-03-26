"use client";

import { CommReply, CommThread } from "@/lib/types";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CreateThreadPanel } from "./create-thread-panel";
import { UserDetailPanel } from "./user-detail-panel";
import { Heart, MessageCircle, Share2, Signal, Loader2, ChevronLeft, Trash2 } from "lucide-react";
import { DriverVideo } from "@/components/ui/driver-video";

type Props = {
  query: string;
};

type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  fav_driver: string | null;
};

type RawProfile = {
  id: string;
  username: string;
  full_name: string;
  fav_driver: string | null;
};

type RawReply = {
  id: string;
  thread_id: string;
  parent_id: string | null;
  message: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  profiles: RawProfile;
};

type RawThread = {
  id: string;
  profile_id: string;
  message: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: RawProfile;
  comms_replies: RawReply[] | null;
};

function countReplies(replies: CommReply[]): number {
  if (!replies) return 0;
  return replies.reduce((acc, reply) => acc + 1 + countReplies(reply.replies), 0);
}

function updateReplyLikeTree(replies: CommReply[], replyId: string, delta: number): CommReply[] {
  return replies.map((r) => {
    if (r.id === replyId) return { ...r, likes: Math.max(0, r.likes + delta) };
    if (!r.replies?.length) return r;
    return { ...r, replies: updateReplyLikeTree(r.replies, replyId, delta) };
  });
}

function addReplyToTree(replies: CommReply[], parentId: string | null, newReply: CommReply): CommReply[] {
  if (!parentId) return [...replies, newReply];
  return replies.map((r) => {
    if (r.id === parentId) return { ...r, replies: [...(r.replies || []), newReply] };
    if (!r.replies?.length) return r;
    return { ...r, replies: addReplyToTree(r.replies, parentId, newReply) };
  });
}

type ReplyNodeProps = {
  reply: CommReply;
  depth: number;
  onReplySubmit: (parentReplyId: string, message: string, imageUrl?: string) => void;
  onReplyLike: (replyId: string) => void;
  onUserClick: (profileId: string) => void;
};

function ReplyNode({ reply, depth, onReplySubmit, onReplyLike, onUserClick }: ReplyNodeProps) {
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
      <div className="dashboard-panel p-3 animate-in fade-in slide-in-from-left-2 duration-300">
        <div className="flex items-center justify-between gap-2">
          <div>
            <button 
              onClick={() => onUserClick(reply.profileId)}
              className="font-headline text-sm hover:text-primary transition-colors text-left"
            >
              {reply.username}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant line-clamp-1">{reply.fullName}</p>
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant shrink-0">
            {new Date(reply.createdAt).toLocaleTimeString("en-GB", { hour12: false })}
          </p>
        </div>
        <p className="mt-2 text-sm text-on-surface leading-normal">{reply.message}</p>

        {reply.imageUrl && (
          <div className="relative mt-3 w-full overflow-hidden rounded-sm border border-outline-variant/25 bg-surface-dim">
            <img 
               src={reply.imageUrl} 
               alt="Reply attachment" 
               className="w-full h-auto object-contain max-h-60" 
            />
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

      {reply.replies?.map((nestedReply) => (
        <ReplyNode
          key={nestedReply.id}
          reply={nestedReply}
          depth={depth + 1}
          onReplySubmit={onReplySubmit}
          onReplyLike={onReplyLike}
          onUserClick={onUserClick}
        />
      ))}
    </article>
  );
}

export function CommsView({ query }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<CommThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [rightPanelMode, setRightPanelMode] = useState<"create" | "detail" | "profile">("create");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [userLikedThreads, setUserLikedThreads] = useState<string[]>([]);
  const [userLikedReplies, setUserLikedReplies] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const inFlightLikesRef = useState(() => new Set<string>())[0];

  // --- FETCHING ---

  const fetchUserProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserProfile(data);

      // Fetch user likes with 404 suppression
      try {
        const { data: threadLikes } = await supabase.from('comms_thread_likes').select('thread_id').eq('profile_id', user.id);
        if (threadLikes) setUserLikedThreads(Array.from(new Set(threadLikes.map(l => l.thread_id))));
      } catch (e) { /* Table missing, skip */ }

      try {
        const { data: replyLikes } = await supabase.from('comms_reply_likes').select('reply_id').eq('profile_id', user.id);
        if (replyLikes) setUserLikedReplies(Array.from(new Set(replyLikes.map(l => l.reply_id))));
      } catch (e) { /* Table missing, skip */ }
    } else {
      setUserProfile(null);
      setUserLikedThreads([]);
      setUserLikedReplies([]);
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comms_threads')
        .select(`
          id, profile_id, message, image_url, likes_count, comments_count, created_at,
          profiles (id, username, full_name, fav_driver),
          comms_replies (
            id, thread_id, parent_id, message, image_url, likes_count, created_at,
            profiles (id, username, full_name, fav_driver)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group replies by parent_id for recursion
      const formatReplies = (replies: RawReply[]): CommReply[] => {
        const buildTree = (parentId: string | null): CommReply[] => {
          return replies
            .filter(r => r.parent_id === parentId)
            .map(r => ({
              id: r.id,
              profileId: r.profiles.id,
              username: r.profiles.username,
              fullName: r.profiles.full_name,
              favDriver: r.profiles.fav_driver,
              message: r.message,
              imageUrl: r.image_url?.startsWith('blob:') ? undefined : (r.image_url ?? undefined),
              likes: r.likes_count,
              createdAt: r.created_at,
              replies: buildTree(r.id)
            }));
        };
        return buildTree(null);
      };

      const formatted: CommThread[] = (data as RawThread[]).map(t => ({
        id: t.id,
        profileId: t.profile_id,
        username: t.profiles.username,
        fullName: t.profiles.full_name,
        favDriver: t.profiles.fav_driver,
        message: t.message,
        imageUrl: t.image_url?.startsWith('blob:') ? undefined : (t.image_url ?? undefined),
        likes: t.likes_count,
        // Derive comment count from the actual reply tree so it never drifts to 0.
        comments: countReplies(formatReplies(t.comms_replies || [])),
        createdAt: t.created_at,
        replies: formatReplies(t.comms_replies || [])
      }));

      setThreads(formatted);
    } catch (err) {
      console.error("Error fetching threads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    fetchUserProfile();

    // 📡 Real-time Subscription
    const channel = supabase
      .channel('paddock-threads')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'comms_threads' }, 
        () => fetchThreads()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchUserProfile()
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile();
    });

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [fetchThreads, fetchUserProfile]);

  const filtered = useMemo(() => {
    if (!query) return threads;
    return threads.filter((thread) =>
      `${thread.username} ${thread.fullName} ${thread.message}`.toLowerCase().includes(query),
    );
  }, [threads, query]);

  const selectedThread = useMemo(
    () => filtered.find((thread) => thread.id === selectedThreadId),
    [filtered, selectedThreadId],
  );

  useEffect(() => {
    if (selectedThreadId) setRightPanelMode("detail");
    else if (!selectedProfileId) setRightPanelMode("create");
  }, [selectedThreadId, selectedProfileId]);

  // --- MUTATIONS ---
  
  const deleteThread = async (id: string) => {
    if (!confirm("CONFIRM SIGNAL TERMINATION? THIS ACTION IS PERMANENT.")) return;
    
    const { error } = await supabase
      .from("comms_threads")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting thread:", error);
    } else {
      fetchThreads();
      if (selectedThreadId === id) setSelectedThreadId("");
    }
  };

  const handleUserClick = useCallback((profileId: string) => {
    if (userProfile && profileId === userProfile.id) {
       router.push('/profile');
    } else {
       setSelectedProfileId(profileId);
       setRightPanelMode("profile");
    }
  }, [userProfile, router]);

  const addReply = async (threadId: string, parentReplyId: string | null, message: string, imageUrl?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
       alert("Sync Error: Please log in to your Super License to transmit.");
       return;
    }

    const optimisticReply: CommReply = {
      id: `optimistic-${crypto.randomUUID()}`,
      profileId: user.id,
      username: userProfile?.username ?? "you",
      fullName: userProfile?.full_name ?? "",
      favDriver: userProfile?.fav_driver ?? null,
      message,
      imageUrl,
      likes: 0,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    // Optimistic local update: increment thread replies immediately and show it in detail view.
    setThreads((prev) =>
      prev.map((t) =>
        t.id !== threadId
          ? t
          : {
              ...t,
              comments: t.comments + 1,
              replies: addReplyToTree(t.replies || [], parentReplyId, optimisticReply),
            },
      ),
    );

    const { error } = await supabase
      .from('comms_replies')
      .insert({
        thread_id: threadId,
        parent_id: parentReplyId,
        profile_id: user.id,
        message,
        image_url: imageUrl
      });

    if (error) console.error("Error transmitting reply:", error);
    // Always refetch after post to reconcile ids + server counts.
    fetchThreads();
  };

  const submitThreadReply = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedThread || !replyMessage.trim()) return;

    addReply(selectedThread.id, null, replyMessage.trim(), replyImage.trim() || undefined);
    setReplyMessage("");
    setReplyImage("");
  };

  const likeThread = async (threadId: string) => {
    if (!userProfile) return;
    const lockKey = `thread:${threadId}`;
    if (inFlightLikesRef.has(lockKey)) return;
    inFlightLikesRef.add(lockKey);

    const isLiked = userLikedThreads.includes(threadId);
    
    // Optimistic local update (zustand-style): update both like list + thread list immediately.
    setUserLikedThreads((prev) => (isLiked ? prev.filter((id) => id !== threadId) : Array.from(new Set([...prev, threadId]))));
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, likes: Math.max(0, t.likes + (isLiked ? -1 : 1)) } : t)));

    try {
      // Idempotent DB write: only insert/delete if needed, then only adjust counter if row changed.
      const { data: existing, error: existsErr } = await supabase
        .from("comms_thread_likes")
        .select("id")
        .eq("thread_id", threadId)
        .eq("profile_id", userProfile.id)
        .limit(1);
      if (existsErr) throw existsErr;

      const hasRow = !!existing?.length;

      if (isLiked) {
        if (hasRow) {
          await supabase.from("comms_thread_likes").delete().eq("thread_id", threadId).eq("profile_id", userProfile.id);
          await supabase.rpc("decrement_thread_likes", { target_id: threadId });
        }
      } else {
        if (!hasRow) {
          await supabase.from("comms_thread_likes").insert({ thread_id: threadId, profile_id: userProfile.id });
          await supabase.rpc("increment_thread_likes", { target_id: threadId });
        }
      }
    } catch (e) {
      // Reconcile if something went wrong.
      console.error("Error toggling thread like:", e);
      fetchThreads();
      fetchUserProfile();
    } finally {
      inFlightLikesRef.delete(lockKey);
    }
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

  const likeReply = async (threadId: string, replyId: string) => {
    if (!userProfile) return;

    const lockKey = `reply:${replyId}`;
    if (inFlightLikesRef.has(lockKey)) return;
    inFlightLikesRef.add(lockKey);

    const isLiked = userLikedReplies.includes(replyId);
    
    // Optimistic local update: affect reply tree immediately, and keep "liked ids" in sync.
    setUserLikedReplies((prev) => (isLiked ? prev.filter((id) => id !== replyId) : Array.from(new Set([...prev, replyId]))));
    setThreads((prev) =>
      prev.map((t) =>
        t.id !== threadId ? t : { ...t, replies: updateReplyLikeTree(t.replies || [], replyId, isLiked ? -1 : 1) },
      ),
    );

    try {
      const { data: existing, error: existsErr } = await supabase
        .from("comms_reply_likes")
        .select("id")
        .eq("reply_id", replyId)
        .eq("profile_id", userProfile.id)
        .limit(1);
      if (existsErr) throw existsErr;

      const hasRow = !!existing?.length;

      if (isLiked) {
        if (hasRow) {
          await supabase.from("comms_reply_likes").delete().eq("reply_id", replyId).eq("profile_id", userProfile.id);
          await supabase.rpc("decrement_reply_likes", { target_id: replyId });
        }
      } else {
        if (!hasRow) {
          await supabase.from("comms_reply_likes").insert({ reply_id: replyId, profile_id: userProfile.id });
          await supabase.rpc("increment_reply_likes", { target_id: replyId });
        }
      }
    } catch (e) {
      console.error("Error toggling reply like:", e);
      fetchThreads();
      fetchUserProfile();
    } finally {
      inFlightLikesRef.delete(lockKey);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-on-surface-variant">Syncing with Pit Wall...</p>
      </div>
    );
  }

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

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 grid-flow-dense">
          {filtered.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const score = computeSignalScore(thread);
            const signal = getSignalLabel(score);
            const hasImage = !!thread.imageUrl;
            const isOwner = userProfile?.id === thread.profileId;

            return (
              <motion.div
                key={thread.id}
                whileHover={{ scale: 1.01 }}
                layout
                className={`dashboard-panel flex flex-col overflow-hidden h-fit ${
                  isSelected ? "border-secondary/60 shadow-[0_0_16px_rgba(126,246,238,0.2)]" : "hover:border-primary/40"
                } ${hasImage ? "md:row-span-2" : ""}`}
              >
                <div 
                  onClick={() => setSelectedThreadId(thread.id)}
                  className="cursor-pointer p-4 flex-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(thread.profileId);
                        }}
                        className="font-headline text-sm text-on-surface hover:text-primary transition-colors text-left"
                      >
                        {thread.username}
                      </button>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                        {thread.fullName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-mono text-[10px] text-on-surface-variant">
                        {new Date(thread.createdAt).toLocaleTimeString("en-GB", { hour12: false })}
                      </p>
                      {isOwner && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteThread(thread.id); }}
                          className="text-on-surface-variant hover:text-alert-red transition-colors"
                          title="Terminate Broadcast"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-on-surface/90">{thread.message}</p>
                </div>

                {hasImage && (
                  <div 
                    onClick={() => setSelectedThreadId(thread.id)}
                    className="w-full overflow-hidden cursor-pointer bg-surface-dim border-y border-outline-variant/10"
                  >
                    <img 
                      src={thread.imageUrl!} 
                      alt="Thread preview" 
                      className="w-full h-auto object-cover max-h-80" 
                    />
                  </div>
                )}

                <div className="p-4 pt-0">
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
                    <button 
                      onClick={(e) => { e.stopPropagation(); likeThread(thread.id); }}
                      className={`flex items-center gap-1 transition-colors ${userLikedThreads.includes(thread.id) ? "text-primary" : "hover:text-primary"}`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${userLikedThreads.includes(thread.id) ? "fill-primary" : ""}`} />
                      {thread.likes}
                    </button>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {thread.comments}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <aside className="thin-scrollbar col-span-12 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto xl:col-span-5 relative">
        {rightPanelMode === "detail" && selectedThread ? (
          <div className="dashboard-panel p-5 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setSelectedThreadId(""); setRightPanelMode("create"); }}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Thread Detail</p>
                    <div className="mt-1 flex flex-col">
                       <button 
                         onClick={() => handleUserClick(selectedThread.profileId)}
                         className="font-headline text-lg hover:text-primary transition-colors text-left"
                       >
                         {selectedThread.username}
                       </button>
                       <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                         {new Date(selectedThread.createdAt).toLocaleTimeString("en-GB", { hour12: false })}
                       </p>
                    </div>
                  </div>
               </div>
               
               <DriverVideo driverName={selectedThread.favDriver || null} className="w-12 h-12 shrink-0 border-outline-variant/30" />
            </div>

            <p className="mt-4 leading-relaxed text-on-surface">{selectedThread.message}</p>

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
              <div className="relative mt-4 overflow-hidden rounded-sm border border-outline-variant/30 bg-surface-dim">
                 <img 
                   src={selectedThread.imageUrl} 
                   alt="Thread attachment" 
                   className="w-full h-auto object-contain"
                 />
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => likeThread(selectedThread.id)}
                className={`flex items-center gap-1.5 border border-outline-variant/30 px-3 py-2 text-xs transition-colors ${
                  userLikedThreads.includes(selectedThread.id) 
                    ? "border-primary/40 text-primary bg-primary/5" 
                    : "text-on-surface-variant hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${userLikedThreads.includes(selectedThread.id) ? "fill-primary" : ""}`} />
                {selectedThread.likes}
              </button>
              <button
                onClick={() => shareThread(selectedThread)}
                className="flex items-center gap-1.5 border border-outline-variant/30 px-3 py-2 text-xs text-on-surface-variant hover:border-secondary/40 hover:text-secondary transition-colors"
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
                className="w-full bg-primary px-4 py-3 font-headline text-sm font-bold tracking-[0.24em] text-black uppercase hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                TRANSMIT
              </button>
            </form>

            <div className="mt-5 border-t border-outline-variant/25 pt-4">
              <h4 className="font-headline text-lg">Replies</h4>
              {!selectedThread.replies || selectedThread.replies.length === 0 ? (
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
                    onUserClick={handleUserClick}
                  />
                ))
              )}
            </div>
          </div>
        ) : rightPanelMode === "profile" ? (
          <UserDetailPanel 
            profileId={selectedProfileId} 
            onBack={() => {
              setRightPanelMode(selectedThreadId ? "detail" : "create");
              setSelectedProfileId("");
            }} 
          />
        ) : (
          userProfile ? (
            <CreateThreadPanel profile={userProfile} onSuccess={() => fetchThreads()} />
          ) : (
            <div className="dashboard-panel p-5 text-center">
              <h3 className="font-headline text-xl uppercase tracking-wider text-primary">Radio Silence</h3>
              <p className="mt-2 text-sm text-on-surface-variant font-mono uppercase tracking-widest">
                Log in to your Super License to broadcast.
              </p>
            </div>
          )
        )}
      </aside>
    </div>
  );
}
