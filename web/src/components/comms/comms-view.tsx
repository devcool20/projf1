"use client";

import { CommReply, CommThread } from "@/lib/types";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateThreadPanel } from "./create-thread-panel";
import { UserDetailPanel } from "./user-detail-panel";
import { Heart, MessageCircle, Share2, Signal, ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { applyTeamAccent, resetTeamAccent } from "@/lib/team-accent";
import { iosSpring, listContainerVariants, listItemVariants, skeletonPulse } from "@/components/motion/premium-motion";

type Props = {
  query: string;
  initialThreadId?: string;
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
  profiles: RawProfile | RawProfile[] | null;
};

type RawThread = {
  id: string;
  profile_id: string;
  message: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
  comms_replies: RawReply[] | null;
};

function pickProfile(profile: RawProfile | RawProfile[] | null): RawProfile {
  if (Array.isArray(profile)) return profile[0] ?? { id: "", username: "unknown", full_name: "Unknown", fav_driver: null };
  if (profile) return profile;
  return { id: "", username: "unknown", full_name: "Unknown", fav_driver: null };
}

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

function LikeBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2">
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          className="absolute text-primary animate-[ping_450ms_ease-out_forwards]"
          style={{
            transform: `translate(${Math.cos((i / 7) * Math.PI * 2) * 22}px, ${Math.sin((i / 7) * Math.PI * 2) * 18}px)`,
          }}
        >
          ❤
        </span>
      ))}
    </span>
  );
}

function ReplyNode({ reply, depth, onReplySubmit, onReplyLike, onUserClick }: ReplyNodeProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState("");
  const [showBurst, setShowBurst] = useState(false);

  const submitReply = (event: FormEvent) => {
    event.preventDefault();
    if (!replyMessage.trim()) return;

    onReplySubmit(reply.id, replyMessage.trim(), replyImage.trim() || undefined);
    setReplyMessage("");
    setReplyImage("");
    setIsReplying(false);
  };

  return (
    <article className="relative mt-3 pl-4" style={{ marginLeft: `${Math.min(depth, 6) * 14}px` }}>
      {depth > 0 && (
        <span className="pointer-events-none absolute -left-2 top-0 h-7 w-5 rounded-bl-2xl border-b-2 border-l-2 border-primary/30" />
      )}
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
            onClick={() => {
              onReplyLike(reply.id);
              setShowBurst(true);
              setTimeout(() => setShowBurst(false), 420);
            }}
            className="relative flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary"
          >
            <LikeBurst show={showBurst} />
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
          <button type="submit" className="bg-primary px-3 py-1.5 font-headline text-xs font-bold tracking-[0.18em] text-white uppercase">
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

export function CommsView({ query, initialThreadId = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<CommThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreadId);
  const [rightPanelMode, setRightPanelMode] = useState<"detail" | "profile">("detail");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [userLikedThreads, setUserLikedThreads] = useState<string[]>([]);
  const [userLikedReplies, setUserLikedReplies] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likeBurstThread, setLikeBurstThread] = useState<string | null>(null);
  const [transmitPulse, setTransmitPulse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prevThreadCount, setPrevThreadCount] = useState(0);
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
      } catch { /* Table missing, skip */ }

      try {
        const { data: replyLikes } = await supabase.from('comms_reply_likes').select('reply_id').eq('profile_id', user.id);
        if (replyLikes) setUserLikedReplies(Array.from(new Set(replyLikes.map(l => l.reply_id))));
      } catch { /* Table missing, skip */ }
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
            .map(r => {
              const replyProfile = pickProfile(r.profiles);
              return ({
              id: r.id,
              profileId: replyProfile.id,
              username: replyProfile.username,
              fullName: replyProfile.full_name,
              favDriver: replyProfile.fav_driver,
              message: r.message,
              imageUrl: r.image_url?.startsWith('blob:') ? undefined : (r.image_url ?? undefined),
              likes: r.likes_count,
              createdAt: r.created_at,
              replies: buildTree(r.id)
              });
            });
        };
        return buildTree(null);
      };

      const formatted: CommThread[] = ((data ?? []) as RawThread[]).map(t => {
        const threadProfile = pickProfile(t.profiles);
        return ({
        id: t.id,
        profileId: t.profile_id,
        username: threadProfile.username,
        fullName: threadProfile.full_name,
        favDriver: threadProfile.fav_driver,
        message: t.message,
        imageUrl: t.image_url?.startsWith('blob:') ? undefined : (t.image_url ?? undefined),
        likes: t.likes_count,
        // Derive comment count from the actual reply tree so it never drifts to 0.
        comments: countReplies(formatReplies(t.comms_replies || [])),
        createdAt: t.created_at,
        replies: formatReplies(t.comms_replies || [])
        });
      });

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
    () => threads.find((thread) => thread.id === selectedThreadId),
    [threads, selectedThreadId],
  );

  const syncThreadUrl = useCallback(
    (threadId: string | null, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(searchParams.toString());
      if (threadId) params.set("t", threadId);
      else params.delete("t");
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      if (mode === "replace") router.replace(nextUrl, { scroll: false });
      else router.push(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeThreadDetail = useCallback(() => {
    setSelectedThreadId("");
    syncThreadUrl(null, "replace");
  }, [syncThreadUrl]);

  const openThreadDetail = useCallback(
    (threadId: string) => {
      setSelectedThreadId(threadId);
      setRightPanelMode("detail");
      syncThreadUrl(threadId, "push");
    },
    [syncThreadUrl],
  );

  useEffect(() => {
    if (selectedThreadId) setRightPanelMode("detail");
  }, [selectedThreadId, selectedProfileId]);

  useEffect(() => {
    const t = searchParams.get("t") ?? "";
    if (t !== selectedThreadId) {
      setSelectedThreadId(t);
      if (t) setRightPanelMode("detail");
    }
  }, [searchParams, selectedThreadId]);

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
      if (selectedThreadId === id) closeThreadDetail();
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

  const openCreateOverlay = useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  const closeCreateOverlay = useCallback(() => {
    setIsCreateOpen(false);
  }, []);

  useEffect(() => {
    if (!selectedProfileId) resetTeamAccent();
  }, [selectedProfileId]);

  useEffect(() => {
    if (prevThreadCount === 0) {
      setPrevThreadCount(threads.length);
      return;
    }
    if (threads.length > prevThreadCount) {
      setToast("New transmission received");
      setTimeout(() => setToast(null), 1800);
      try {
        const WinAudio = window as Window & { webkitAudioContext?: typeof AudioContext };
        const Ctx = window.AudioContext ?? WinAudio.webkitAudioContext;
        if (!Ctx) return;
        const audioCtx = new Ctx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 620;
        gain.gain.value = 0.03;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.09);
      } catch {}
    }
    setPrevThreadCount(threads.length);
  }, [threads.length, prevThreadCount]);

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
    setTransmitPulse(true);
    setTimeout(() => setTransmitPulse(false), 500);
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

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="comms-loading"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={iosSpring}
          className="grid gap-4 md:grid-cols-2"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={skeletonPulse}
              initial="initial"
              animate="animate"
              className={`skeleton-shimmer rounded-[24px] ${i < 2 ? "h-40" : "h-64"}`}
            />
          ))}
        </motion.div>
      ) : (
    <motion.div
      key="comms-loaded"
      layout
      initial={{ opacity: 0, y: 20, scale: 1.01 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.99 }}
      transition={iosSpring}
      className="grid grid-cols-12 gap-3 sm:gap-4"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className="fixed right-6 top-24 z-80 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <section className={`col-span-12 xl:col-span-8 ${selectedThreadId ? "hidden xl:block" : "block"}`}>
        <div className="mb-4 flex items-end justify-between border-b border-primary/20 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">The Grid</p>
            <h2 className="font-headline text-3xl font-bold">Comms Threads</h2>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            {filtered.length} active comms
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-flow-dense"
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
        >
          {filtered.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const score = computeSignalScore(thread);
            const signal = getSignalLabel(score);
            const hasImage = !!thread.imageUrl;
            const isOwner = userProfile?.id === thread.profileId;

            return (
              <motion.div
                key={thread.id}
                variants={listItemVariants}
                transition={iosSpring}
                whileHover={{ scale: 1.01 }}
                layout
                className={`dashboard-panel flex flex-col overflow-hidden h-fit ${
                  isSelected ? "border-secondary/60 shadow-[0_0_16px_rgba(126,246,238,0.2)]" : "hover:border-primary/40"
                } ${hasImage ? "md:row-span-2" : ""}`}
              >
                <div 
                  onClick={() => openThreadDetail(thread.id)}
                  className="cursor-pointer p-4 flex-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openThreadDetail(thread.id);
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
                    onClick={() => openThreadDetail(thread.id)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        likeThread(thread.id);
                        setLikeBurstThread(thread.id);
                        setTimeout(() => setLikeBurstThread(null), 420);
                      }}
                      className={`relative flex items-center gap-1 transition-colors ${userLikedThreads.includes(thread.id) ? "text-primary" : "hover:text-primary"}`}
                    >
                      <LikeBurst show={likeBurstThread === thread.id} />
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
        </motion.div>
      </section>

      <aside
        className={`col-span-12 mx-auto w-full max-w-2xl xl:col-span-4 xl:max-w-none ${
          rightPanelMode === "detail" && !!selectedThreadId
            ? "fixed inset-0 z-85 bg-slate-900/20 p-3 pb-20 backdrop-blur-[2px] xl:relative xl:inset-auto xl:z-auto xl:bg-transparent xl:p-0 xl:backdrop-blur-0"
            : "relative"
        }`}
        onClick={rightPanelMode === "detail" && !!selectedThreadId ? closeThreadDetail : undefined}
      >
        <AnimatePresence mode="wait">
          {rightPanelMode === "detail" && selectedThread ? (
            <motion.div
              key={selectedThread.id}
              initial={{ x: 44, opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 44, opacity: 0.5 }}
              transition={iosSpring}
              className="dashboard-panel h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-card p-4 sm:p-5 xl:h-auto xl:overflow-visible"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="flex items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
               <div className="flex items-center gap-3">
                  <button 
                    onClick={closeThreadDetail}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Thread Detail</p>
                    <div className="mt-1 flex flex-col">
                       <button
                         onClick={() => handleUserClick(selectedThread.profileId)}
                         className="font-headline text-base sm:text-lg hover:text-primary transition-colors text-left"
                       >
                         {selectedThread.username}
                       </button>
                       <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                         {new Date(selectedThread.createdAt).toLocaleTimeString("en-GB", { hour12: false })}
                       </p>
                    </div>
                  </div>
               </div>
               
               <div className="h-7 min-w-20 rounded-full border border-outline-variant/30 bg-surface-container-low px-2.5 py-1" />
            </div>

            <div className="mt-3 rounded-xl border border-outline-variant/25 bg-linear-to-br from-white/80 via-white to-surface-container-low p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Transmission</p>
              <p className="mt-2 leading-relaxed text-sm sm:text-base text-on-surface">{selectedThread.message}</p>
            </div>

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
              <div className="relative mt-4 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-dim shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
                 <img 
                   src={selectedThread.imageUrl} 
                   alt="Thread attachment" 
                   className="w-full h-auto object-contain"
                 />
                 <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/25 to-transparent px-3 py-2">
                   <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/90">Visual Feed</p>
                 </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
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

            <form onSubmit={submitThreadReply} className="mt-4 space-y-2 border-t border-outline-variant/25 pt-3">
              <textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                className="w-full resize-none border border-outline-variant/35 bg-surface-container-low p-3 font-mono text-xs tracking-[0.12em] text-on-surface outline-none focus:border-secondary"
                placeholder="ENTER RADIO TRANSCRIPT..."
                rows={3}
              />
              <input
                value={replyImage}
                onChange={(event) => setReplyImage(event.target.value)}
                className="w-full border border-outline-variant/35 bg-surface-container-low p-2 text-xs outline-none focus:border-secondary"
                placeholder="Optional image URL for this reply"
              />
              <button
                type="submit"
                className={`w-full px-4 py-3 font-headline text-sm font-bold tracking-[0.24em] uppercase transition-transform ${
                  transmitPulse
                    ? "bg-emerald-400 text-emerald-950 shadow-[0_0_22px_rgba(74,222,128,0.6)] animate-pulse"
                    : "bg-primary text-white hover:scale-[1.01] active:scale-[0.99]"
                }`}
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
            </motion.div>
          ) : rightPanelMode === "profile" ? (
            <motion.div
              key={`profile-${selectedProfileId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <UserDetailPanel 
                profileId={selectedProfileId} 
                onTeamAccent={(teamName) => applyTeamAccent(teamName)}
                onBack={() => {
                  setRightPanelMode("detail");
                  setSelectedProfileId("");
                }} 
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </aside>

      <button
        onClick={openCreateOverlay}
        className="fixed bottom-24 right-3 z-86 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_24px_rgba(124,58,237,0.38)] transition hover:scale-105 active:scale-95"
        aria-label="Create thread"
      >
        <Plus className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-87 bg-slate-900/25 p-3 pb-20 backdrop-blur-[2px]"
            onClick={closeCreateOverlay}
          >
            <motion.div
              initial={{ y: 34, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 34, opacity: 0 }}
              className="mx-auto h-[calc(100dvh-7.5rem)] max-w-2xl overflow-y-auto rounded-card"
              onClick={(event) => event.stopPropagation()}
            >
              {userProfile ? (
                <div className="relative">
                  <button
                    onClick={closeCreateOverlay}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 bg-white/90 text-on-surface-variant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <CreateThreadPanel
                    profile={userProfile}
                    onSuccess={() => {
                      fetchThreads();
                      closeCreateOverlay();
                    }}
                  />
                </div>
              ) : (
                <div className="dashboard-panel p-5 text-center">
                  <button
                    onClick={closeCreateOverlay}
                    className="ml-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 bg-white/90 text-on-surface-variant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h3 className="font-headline text-xl uppercase tracking-wider text-primary">Radio Silence</h3>
                  <p className="mt-2 text-sm text-on-surface-variant font-mono uppercase tracking-widest">
                    Log in to your Super License to broadcast.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
