"use client";

import { CommReply, CommThread } from "@/lib/types";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState, useCallback, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateThreadPanel } from "./create-thread-panel";
import { UserDetailPanel } from "./user-detail-panel";
import { Trash2, Heart, MessageCircle, Signal, Shield, ChevronLeft, Send, Image as ImageIcon, X, User, Share2, Plus, ImagePlus, Loader2 } from "lucide-react";
import { applyTeamAccent, resetTeamAccent, getTeamColor } from "@/lib/team-accent";
import { fastFade, listContainerVariants, listItemVariants, modalSpring, overlayVariants, modalPanelVariants, skeletonPulse } from "@/components/motion/premium-motion";
import { useComms } from "@/lib/contexts/comms-context";



export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return date.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) + (date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '');
  } else if (diffHour > 0) {
    return `${diffHour}h`;
  } else if (diffMin > 0) {
    return `${diffMin}m`;
  } else {
    return `${Math.max(0, diffSec)}s`;
  }
}

function portalSubscribe() {
  return () => {};
}

type Props = {
  query: string;
  initialThreadId?: string;
};

type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  fav_driver: string | null;
  fav_team?: string | null;
  avatar_url?: string | null;
};

type RawProfile = {
  id: string;
  username: string;
  full_name: string;
  fav_driver: string | null;
  fav_team?: string | null;
  avatar_url?: string | null;
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
  onReplySubmit: (parentReplyId: string, message: string, imageUrl?: string) => Promise<void>;
  onReplyLike: (replyId: string) => void;
  onReplyDelete: (replyId: string, isNested: boolean) => void;
  onUserClick: (profileId: string) => void;
  userLikedReplies: string[];
  userProfile: UserProfile | null;
  uploadReplyImage: (file: File) => Promise<string | null>;
};

function ExpandableText({ text, lineClamp = 3 }: { text: string; lineClamp?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={`text-sm leading-relaxed text-on-surface/90 ${expanded ? "" : `line-clamp-${lineClamp}`}`}
        style={expanded ? undefined : { WebkitLineClamp: lineClamp, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {clamped && !expanded && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpanded(true); }}
          className="btn-premium btn-ghost mt-1 rounded-lg px-2.5 py-1 text-xs font-medium text-primary"
        >
          Show more
        </motion.button>
      )}
      {expanded && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpanded(false); }}
          className="btn-premium btn-ghost mt-1 rounded-lg px-2.5 py-1 text-xs font-medium text-primary"
        >
          Show less
        </motion.button>
      )}
    </div>
  );
}

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
          â¤
        </span>
      ))}
    </span>
  );
}

function ReplyNode({ reply, depth, onReplySubmit, onReplyLike, onReplyDelete, onUserClick, userLikedReplies, userProfile, uploadReplyImage }: ReplyNodeProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBurst, setShowBurst] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!replyMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    let imageUrl: string | undefined;

    if (replyImageFile) {
      const uploaded = await uploadReplyImage(replyImageFile);
      if (uploaded) imageUrl = uploaded;
    }

    await onReplySubmit(reply.id, replyMessage.trim(), imageUrl);
    setReplyMessage("");
    setReplyImageFile(null);
    setReplyImagePreview(null);
    setIsReplying(false);
    setIsSubmitting(false);
  };

  return (
    <article className="flex gap-3">
      {/* Left column: avatar + vertical thread line */}
      <div className="flex flex-col items-center shrink-0 w-9">
        {/* Avatar - double-wrapped to guarantee overflow clipping */}
        <div
          className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden border-2"
          style={{ borderColor: reply.favTeam ? getTeamColor(reply.favTeam) : 'rgba(127,127,127,0.3)' }}
        >
          <button
            onClick={() => onUserClick(reply.profileId)}
            className="absolute inset-0 flex items-center justify-center bg-surface-container-high font-headline text-xs text-on-surface hover:opacity-80 transition-opacity"
          >
            {reply.avatarUrl ? (
              <img src={reply.avatarUrl} alt={reply.fullName} className="h-full w-full object-cover" />
            ) : (
              <span>{reply.username?.replace(/^@/, '')[0]?.toUpperCase()}</span>
            )}
          </button>
        </div>
        {/* Vertical thread connector line under avatar */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-1.5 w-0.5 flex-1 min-h-4 rounded-full bg-outline-variant/25" />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-3">
        {/* Header: name · handle · time · [delete] */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <button
            onClick={() => onUserClick(reply.profileId)}
            className="flex items-baseline gap-1.5 min-w-0 hover:opacity-80 transition-opacity text-left"
          >
            <span className="font-semibold text-sm text-on-surface truncate">{reply.fullName}</span>
            <span className="text-xs text-on-surface-variant/60 truncate">@{reply.username?.replace(/^@/, '')}</span>
            <span className="text-[10px] text-on-surface-variant/35 font-mono shrink-0 ml-0.5">{formatTimeAgo(reply.createdAt)}</span>
          </button>

          {userProfile?.id === reply.profileId && (
            <button
              onClick={(e) => { e.stopPropagation(); onReplyDelete(reply.id, depth > 0); }}
              className="text-on-surface-variant/25 hover:text-red-400 p-1.5 rounded-full hover:bg-red-400/10 transition-colors shrink-0"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        <p className="mt-1 text-sm leading-normal" style={{ color: '#0f172a' }}>{reply.message}</p>

        {reply.imageUrl && (
          <div className="relative mt-3 w-full overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-dim">
            <img 
               src={reply.imageUrl} 
               alt="Reply attachment" 
               className="w-full h-auto object-contain max-h-60" 
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => {
              onReplyLike(reply.id);
              setShowBurst(true);
              setTimeout(() => setShowBurst(false), 420);
            }}
            className={`group flex items-center gap-1.5 text-xs transition-colors ${userLikedReplies.includes(reply.id) ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"}`}
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
              <LikeBurst show={showBurst} />
              <Heart className={`h-4 w-4 ${userLikedReplies.includes(reply.id) ? "fill-primary" : ""}`} />
            </div>
            {reply.likes > 0 && <span>{reply.likes}</span>}
          </motion.button>
          {depth === 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setIsReplying((value) => !value)}
              className="group flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-secondary transition-colors"
            >
               <div className="flex h-7 w-7 items-center justify-center rounded-full group-hover:bg-secondary/10 transition-colors">
                <MessageCircle className="h-4 w-4" />
              </div>
              Reply
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={submitReply} 
              className="mt-3 overflow-hidden"
            >
              <div className="flex gap-3">
                {depth === 0 && (
                  <div className="pt-1 shrink-0">
                    <div 
                      className="flex h-8 w-8 overflow-hidden items-center justify-center rounded-full bg-surface-container-high border-2 text-on-surface font-headline text-[10px]"
                      style={{ borderColor: userProfile?.fav_team ? getTeamColor(userProfile.fav_team) : 'rgb(var(--outline-variant) / 0.3)' }}
                    >
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt={userProfile.username} className="h-full w-full object-cover" />
                      ) : (
                        userProfile?.username?.replace(/^@/, '')[0]?.toUpperCase() || <User className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm text-on-surface outline-none focus:border-secondary focus:bg-surface transition-all pr-12"
                      placeholder="Post your reply"
                      rows={2}
                      disabled={isSubmitting}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) { setReplyImageFile(file); setReplyImagePreview(URL.createObjectURL(file)); }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-on-surface-variant/60 hover:text-secondary transition-colors"
                      >
                        <ImagePlus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {replyImagePreview && (
                    <div className="relative w-full overflow-hidden rounded-xl border border-outline-variant/30 max-w-[200px]">
                      <img src={replyImagePreview} alt="Preview" className="w-full h-auto max-h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setReplyImageFile(null); setReplyImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <motion.button 
                      whileTap={{ scale: 0.95 }} 
                      type="submit" 
                      disabled={!replyMessage.trim() || isSubmitting}
                      className="btn-premium px-5 py-1.5 text-xs font-bold bg-primary text-on-primary rounded-full disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reply"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Nested replies — indented with a left border line (Twitter-style) */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-3 space-y-0 pl-3 border-l-2 border-outline-variant/20">
            {(showAllReplies ? reply.replies : reply.replies.slice(0, 1)).map((nestedReply) => (
              <div key={nestedReply.id} className="pt-3">
                <ReplyNode
                  reply={nestedReply}
                  depth={depth + 1}
                  onReplySubmit={onReplySubmit}
                  onReplyLike={onReplyLike}
                  onReplyDelete={onReplyDelete}
                  onUserClick={onUserClick}
                  userLikedReplies={userLikedReplies}
                  userProfile={userProfile}
                  uploadReplyImage={uploadReplyImage}
                />
              </div>
            ))}
          </div>
        )}

        {!showAllReplies && reply.replies && reply.replies.length > 1 && (
          <button
            onClick={() => setShowAllReplies(true)}
            className="mt-3 text-xs font-bold text-primary hover:underline ml-11"
          >
            Show {reply.replies.length - 1} more replies
          </button>
        )}
      </div>
    </article>
  );
}

export function CommsView({ query, initialThreadId = "" }: Props) {
  const portalMounted = useSyncExternalStore(portalSubscribe, () => true, () => false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<CommThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreadId);
  const [rightPanelMode, setRightPanelMode] = useState<"detail">("detail");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [userLikedThreads, setUserLikedThreads] = useState<string[]>([]);
  const [userLikedReplies, setUserLikedReplies] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likeBurstThread, setLikeBurstThread] = useState<string | null>(null);
  const [transmitPulse, setTransmitPulse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prevThreadCount, setPrevThreadCount] = useState(0);
  const inFlightLikesRef = useState(() => new Set<string>())[0];

  const { threads: globalThreads, loading: globalLoading, userProfile: globalProfile, userLikedThreads: globalLikedThreads, userLikedReplies: globalLikedReplies, refreshData } = useComms();

  useEffect(() => {
    setThreads(globalThreads);
    setLoading(globalLoading);
  }, [globalThreads, globalLoading]);

  useEffect(() => {
    setUserProfile(globalProfile);
    setUserLikedThreads(globalLikedThreads);
    setUserLikedReplies(globalLikedReplies);
  }, [globalProfile, globalLikedThreads, globalLikedReplies]);

  // --- OPTIMISTIC UPDATES & EVENT HANDLERS ---

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
  
  // Permission model:
  // - Thread owner (user1): deletes the entire thread + all replies + all likes
  // - Main reply owner (user2): deletes their reply + all nested replies under it  
  // - Nested reply owner (user3/4): deletes only their own leaf reply
  // All deletions go through SECURITY DEFINER RPCs to bypass RLS cross-user restrictions.

  const deleteThread = async (id: string) => {
    if (!userProfile) return;
    if (!confirm("Delete this entire thread and all replies? This cannot be undone.")) return;
    
    // Use RPC (SECURITY DEFINER) to bypass RLS: it verifies ownership server-side
    const { error } = await supabase.rpc('delete_comm_thread', {
      p_thread_id: id,
      p_profile_id: userProfile.id
    });
    
    if (error) {
      console.error('deleteThread RPC error:', error);
      if (error.message?.includes('function') || error.code === 'PGRST202') {
        alert('SQL Setup Required. Please run the delete_comm_thread() function script in your Supabase SQL Editor.');
      } else {
        alert(`Delete failed: ${error.message}`);
      }
      return;
    }
    
    refreshData();
    if (selectedThreadId === id) closeThreadDetail();
  };

  const deleteReply = async (replyId: string, isNested: boolean = false) => {
    if (!userProfile) return;
    const confirmMsg = isNested
      ? 'Delete this reply?'
      : 'Delete this reply and all nested replies under it?';
    if (!confirm(confirmMsg)) return;
    
    // Use RPC (SECURITY DEFINER) to bypass RLS.
    // The function is responsible for checking ownership and deleting the whole subtree.
    const { error } = await supabase.rpc('delete_comm_reply', {
      p_reply_id: replyId,
      p_profile_id: userProfile.id
    });
    
    if (error) {
      console.error('deleteReply RPC error:', error);
      if (error.message?.includes('function') || error.code === 'PGRST202') {
        alert('SQL Setup Required. Please run the delete_comm_reply() function script in your Supabase SQL Editor.');
      } else {
        alert(`Delete failed: ${error.message}`);
      }
      return;
    }
    
    refreshData();
  };

  const handleUserClick = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
  }, []);

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
    if (!isCreateOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isCreateOpen]);

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
    refreshData();
  };

  const uploadReplyImage = async (file: File): Promise<string | null> => {
    const fileName = `replies/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    try {
      const { data, error } = await supabase.storage.from('comm_images').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('comm_images').getPublicUrl(data.path);
      return publicUrl;
    } catch (err) {
      console.error('Reply image upload failed:', err);
      return null;
    }
  };

  const submitThreadReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedThread || !replyMessage.trim()) return;

    let imageUrl: string | undefined;
    if (replyImageFile) {
      const uploaded = await uploadReplyImage(replyImageFile);
      if (uploaded) imageUrl = uploaded;
    }

    addReply(selectedThread.id, null, replyMessage.trim(), imageUrl);
    setTransmitPulse(true);
    setTimeout(() => setTransmitPulse(false), 500);
    setReplyMessage('');
    setReplyImageFile(null);
    setReplyImagePreview(null);
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const likeThread = async (threadId: string) => {
    if (!userProfile) return;
    const lockKey = `thread:${threadId}`;
    if (inFlightLikesRef.has(lockKey)) return;
    inFlightLikesRef.add(lockKey);

    const isLikedLocally = userLikedThreads.includes(threadId);
    const intendedToLike = !isLikedLocally;
    
    // Optimistic local update: update both like list + thread list immediately.
    setUserLikedThreads((prev) => (intendedToLike ? Array.from(new Set([...prev, threadId])) : prev.filter((id) => id !== threadId)));
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, likes: Math.max(0, t.likes + (intendedToLike ? 1 : -1)) } : t)));

    try {
      // Use RPC to handle single like logic server-side to prevent races/infinite likes
      const { error } = await supabase.rpc('handle_thread_like', {
        p_thread_id: threadId,
        p_profile_id: userProfile.id,
        p_intended_to_like: intendedToLike
      });
      if (error) throw error;
    } catch (e) {
      console.error('Error toggling thread like:', e);
      // Rollback optimistic update on error
      setUserLikedThreads((prev) => (!intendedToLike ? Array.from(new Set([...prev, threadId])) : prev.filter((id) => id !== threadId)));
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, likes: Math.max(0, t.likes + (!intendedToLike ? 1 : -1)) } : t)));
    } finally {
      inFlightLikesRef.delete(lockKey);
      refreshData();
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

    const isLikedLocally = userLikedReplies.includes(replyId);
    const intendedToLike = !isLikedLocally;
    
    // Optimistic local update: affect reply tree immediately, and keep "liked ids" in sync.
    setUserLikedReplies((prev) => (intendedToLike ? Array.from(new Set([...prev, replyId])) : prev.filter((id) => id !== replyId)));
    setThreads((prev) =>
      prev.map((t) =>
        t.id !== threadId ? t : { ...t, replies: updateReplyLikeTree(t.replies || [], replyId, intendedToLike ? 1 : -1) },
      ),
    );

    try {
      const { error } = await supabase.rpc('handle_reply_like', {
        p_reply_id: replyId,
        p_profile_id: userProfile.id,
        p_intended_to_like: intendedToLike
      });
      if (error) throw error;
    } catch (e) {
      console.error('Error toggling reply like:', e);
      setUserLikedReplies((prev) => (!intendedToLike ? Array.from(new Set([...prev, replyId])) : prev.filter((id) => id !== replyId)));
      setThreads((prev) =>
        prev.map((t) =>
          t.id !== threadId ? t : { ...t, replies: updateReplyLikeTree(t.replies || [], replyId, !intendedToLike ? 1 : -1) },
        ),
      );
    } finally {
      inFlightLikesRef.delete(lockKey);
      refreshData();
    }
  };

  return (
    <AnimatePresence mode="popLayout">
      {loading ? (
        <motion.div
          key="comms-loading"
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0 }}
          className="grid gap-4 md:grid-cols-2 md:grid-flow-dense"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={listItemVariants}
              className={`card-surface rounded-[24px] border border-outline-variant/30 flex flex-col p-4 sm:p-5 ${i % 2 === 0 ? "h-44" : "h-64"}`}
            >
              <div className="flex gap-3">
                 <div className="w-12 h-12 rounded-full skeleton-pulse shrink-0" />
                 <div className="flex flex-col gap-2 flex-1 pt-1">
                   <div className="w-32 h-4 skeleton-pulse rounded-md" />
                   <div className="w-20 h-3 skeleton-pulse rounded-md" />
                 </div>
              </div>
              <div className="mt-4 flex-1">
                 <div className="w-full h-4 skeleton-pulse rounded-md mb-3" />
                 <div className="w-3/4 h-4 skeleton-pulse rounded-md mb-3" />
                 <div className="w-5/6 h-4 skeleton-pulse rounded-md" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
    <motion.div
      key="comms-loaded"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fastFade}
      className="grid grid-cols-12 gap-3 sm:gap-4"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastFade}
            className="fixed right-6 top-24 z-80 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <section className={`col-span-12 xl:col-span-8 ${selectedThreadId ? "hidden xl:block" : "block"}`}>
        <div className="mb-4 flex items-end justify-between border-b border-primary/20 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80">Transmission Feed</p>
            <h2 className="font-headline text-3xl font-bold text-slate-900 tracking-tight">The Grid</h2>
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
            const isNew = (new Date().getTime() - new Date(thread.createdAt).getTime()) < 3600000; // < 1 hour ago

              const isSelectedCard = selectedThreadId === thread.id && rightPanelMode === "detail";
              return (
              <motion.div
                key={thread.id}
                variants={listItemVariants}
                whileTap={{ scale: 0.98 }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                style={isSelectedCard ? {
                  backgroundColor: 'rgba(30, 64, 175, 0.08)', // Subtle deep blue/navy tint
                  boxShadow: '0 2px 12px rgba(30, 64, 175, 0.12)',
                } : {}}
                className={`card-surface group cursor-pointer transition-colors border border-outline-variant/30 ${
                  isSelectedCard ? "border-blue-500/30" : "hover:border-outline-variant/60 hover:shadow-md"
                }`}
                onClick={() => openThreadDetail(thread.id)}
              >
                <div className="cursor-pointer p-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-center gap-3">
                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handleUserClick(thread.profileId);
                         }}
                         className="flex h-10 w-10 shrink-0 overflow-hidden items-center justify-center rounded-full bg-surface-container-high border-2 text-on-surface hover:ring-2 hover:ring-primary/40 transition-all font-headline text-sm"
                         style={{ borderColor: thread.favTeam ? getTeamColor(thread.favTeam) : 'rgb(var(--outline-variant) / 0.3)' }}
                       >
                         {thread.avatarUrl ? (
                            <img src={thread.avatarUrl} alt={thread.fullName} className="h-full w-full object-cover" />
                         ) : (
                            thread.username?.replace(/^@/, '')[0]?.toUpperCase()
                         )}
                       </button>
                      
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openThreadDetail(thread.id);
                            }}
                            className="font-bold text-sm text-on-surface hover:underline transition-colors text-left"
                          >
                            {thread.fullName}
                          </button>
                          <p className="text-sm text-on-surface-variant shrink-0">
                            @{thread.username?.replace(/^@/, '')}
                          </p>
                          <span className="text-sm text-on-surface-variant/40" aria-hidden>·</span>
                          <span className="text-xs text-on-surface-variant shrink-0">
                            {formatTimeAgo(thread.createdAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {score > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/20">
                              <Signal className="h-2.5 w-2.5" style={{ color: signal.color }} />
                              <span className="font-mono text-[8px] uppercase tracking-wider font-bold" style={{ color: signal.color }}>
                                Signal {score}
                              </span>
                            </div>
                          )}
                          {isNew && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                              <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-primary">
                                New
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteThread(thread.id); }}
                        className="text-on-surface-variant/50 hover:text-alert-red hover:bg-alert-red/10 flex h-7 w-7 items-center justify-center rounded-full transition-colors shrink-0"
                        title="Terminate Broadcast"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 ml-13 sm:ml-13 pr-2">
                    <p className="text-[15px] sm:text-base leading-normal" style={{ color: '#0f172a' }}>{thread.message}</p>
                  </div>
                </div>

                {hasImage && (
                  <div 
                    onClick={() => openThreadDetail(thread.id)}
                    className="w-full overflow-hidden cursor-pointer mt-2 mb-1 px-4"
                  >
                    <img 
                      src={thread.imageUrl!} 
                      alt="Thread preview" 
                      className="w-full h-auto object-cover max-h-56 rounded-xl border border-outline-variant/20 shadow-sm" 
                    />
                  </div>
                )}

                <div className="px-4 pb-3 flex items-center gap-6 ml-13 border-t border-outline-variant/5 pt-2 mt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={(e) => {
                       e.stopPropagation();
                       likeThread(thread.id);
                    }}
                    className="group flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
                  >
                     <div className="flex h-7 w-7 items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
                       <Heart className={`h-4 w-4 ${userLikedThreads.includes(thread.id) ? "fill-primary text-primary" : ""}`} />
                     </div>
                     {thread.likes > 0 && <span className={userLikedThreads.includes(thread.id) ? "text-primary font-medium" : ""}>{thread.likes}</span>}
                  </motion.button>
                  <div className="group flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-secondary transition-colors cursor-pointer" onClick={() => openThreadDetail(thread.id)}>
                     <div className="flex h-7 w-7 items-center justify-center rounded-full group-hover:bg-secondary/10 transition-colors">
                       <MessageCircle className="h-4 w-4" />
                     </div>
                     {thread.comments > 0 && <span>{thread.comments}</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <AnimatePresence>
        {!!selectedThreadId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={modalSpring}
            className="fixed inset-0 z-[50] bg-background/90 xl:hidden"
            onClick={closeThreadDetail}
          />
        )}
      </AnimatePresence>
      <aside
        className={`col-span-12 mx-auto w-full max-w-2xl xl:col-span-4 xl:max-w-none ${
          !!selectedThreadId
            ? "fixed inset-0 z-[60] bg-background/90 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:relative xl:inset-auto xl:z-auto xl:bg-transparent xl:p-0"
            : "relative"
        }`}
        onClick={!!selectedThreadId ? closeThreadDetail : undefined}
      >
        <AnimatePresence mode="popLayout">
          {selectedThread ? (
            <motion.div
              key={selectedThread.id}
              variants={modalPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={modalSpring}
              className="dashboard-panel premium-scrollbar h-[calc(100dvh-7rem)] overflow-y-auto rounded-card p-4 sm:p-5 xl:h-auto xl:overflow-visible"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={closeThreadDetail}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-on-surface" />
                </motion.button>
                <h2 className="font-bold text-lg text-on-surface">Post</h2>
              </div>

              {userProfile?.id === selectedThread.profileId && (
                <button
                  type="button"
                  onClick={() => deleteThread(selectedThread.id)}
                  className="text-on-surface-variant/50 hover:text-alert-red hover:bg-alert-red/10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  title="Purge Signal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="pt-4">
              <div className="flex items-start gap-3">
                 <button 
                    onClick={() => handleUserClick(selectedThread.profileId)}
                    className="flex h-12 w-12 shrink-0 overflow-hidden items-center justify-center rounded-full bg-surface-container border-2 text-on-surface hover:border-primary transition-colors font-headline text-lg"
                    style={{ borderColor: selectedThread.favTeam ? getTeamColor(selectedThread.favTeam) : 'rgb(var(--outline-variant) / 0.3)' }}
                  >
                    {selectedThread.avatarUrl ? (
                      <img src={selectedThread.avatarUrl} alt={selectedThread.fullName} className="h-full w-full object-cover" />
                    ) : (
                      selectedThread.username?.replace(/^@/, '')[0]?.toUpperCase()
                    )}
                  </button>
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleUserClick(selectedThread.profileId)}
                      className="font-bold text-base hover:underline transition-all text-on-surface text-left leading-tight"
                    >
                      {selectedThread.fullName}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-sm text-on-surface-variant">
                        @{selectedThread.username?.replace(/^@/, '')}
                      </span>
                    </div>
                  </div>
              </div>

              <div className="mt-3 pt-2">
                <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#0f172a' }}>{selectedThread.message}</p>
              </div>

              {selectedThread.imageUrl && (
                <div className="relative mt-4 w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-dim">
                   <img 
                     src={selectedThread.imageUrl} 
                     alt="Thread attachment" 
                     className="w-full h-auto object-contain max-h-[60vh]"
                   />
                </div>
              )}

              {/* Signal Score - Minimized */}
              {(() => {
                const detailScore = computeSignalScore(selectedThread);
                const detailSignal = getSignalLabel(detailScore);
                if (detailScore > 0) return (
                  <div className="mt-4 flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 w-fit">
                    <Signal className="h-3 w-3" style={{ color: detailSignal.color }} />
                    <span className="text-xs text-on-surface-variant font-mono">
                      Signal <strong style={{ color: detailSignal.color }}>{detailScore}</strong>
                    </span>
                  </div>
                );
                return null;
              })()}

              <div className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant border-b border-outline-variant/20 pb-4">
                <span>{formatTimeAgo(selectedThread.createdAt)}</span>
              </div>

              <div className="flex items-center justify-around py-2 border-b border-outline-variant/20">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  data-active={userLikedThreads.includes(selectedThread.id) ? "true" : undefined}
                  onClick={() => likeThread(selectedThread.id)}
                  className="group flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
                    <Heart className={`h-5 w-5 ${userLikedThreads.includes(selectedThread.id) ? "fill-primary text-primary" : ""}`} />
                  </div>
                  {selectedThread.likes > 0 && <span className={userLikedThreads.includes(selectedThread.id) ? "text-primary font-medium" : ""}>{selectedThread.likes}</span>}
                </motion.button>

                <div className="group flex items-center gap-2 text-sm text-on-surface-variant">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  {selectedThread.comments > 0 && <span>{selectedThread.comments}</span>}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => shareThread(selectedThread)}
                  className="group flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full group-hover:bg-secondary/10 transition-colors">
                    <Share2 className="h-5 w-5" />
                  </div>
                  {shareState === "copied" ? "Copied" : ""}
                </motion.button>
              </div>

              {/* Composition Box for main thread reply */}
              <form onSubmit={submitThreadReply} className="py-4 border-b border-outline-variant/20 flex gap-3">
                <div 
                  onClick={() => handleUserClick(userProfile?.id || "")}
                  className="flex h-14 w-14 shrink-0 overflow-hidden items-center justify-center rounded-full bg-surface-container-high border-2 border-outline-variant/30 text-on-surface font-headline text-xl cursor-pointer hover:border-primary transition-colors"
                >
                  {userProfile?.avatar_url ? (
                     <img src={userProfile.avatar_url} alt={userProfile.full_name} className="h-full w-full object-cover" />
                  ) : (
                     userProfile?.username?.replace(/^@/, '')[0]?.toUpperCase() || <User className="h-6 w-6 text-on-surface-variant"/>
                  )}
                </div>
                 <div className="flex-1 space-y-3">
                    <textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      className="w-full resize-none bg-transparent pt-3 text-lg text-on-surface outline-none placeholder:text-on-surface-variant/60"
                      placeholder="Post your reply"
                      rows={1}
                      style={{ minHeight: '40px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                    {replyImagePreview && (
                       <div className="relative w-full overflow-hidden rounded-lg border border-outline-variant/30">
                         <img src={replyImagePreview} alt="Preview" className="w-full h-auto max-h-40 object-cover" />
                         <button
                           type="button"
                           onClick={() => { setReplyImageFile(null); setReplyImagePreview(null); if (replyFileInputRef.current) replyFileInputRef.current.value = ""; }}
                           className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                         >
                           <X className="h-3 w-3" />
                         </button>
                       </div>
                     )}
                     <input
                       type="file"
                       ref={replyFileInputRef}
                       accept="image/*"
                       className="hidden"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) { setReplyImageFile(file); setReplyImagePreview(URL.createObjectURL(file)); }
                       }}
                     />
                     <div className="flex items-center justify-between pt-2">
                        <button type="button" onClick={() => replyFileInputRef.current?.click()} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                       </button>
                       <motion.button
                         whileTap={{ scale: 0.95 }}
                         type="submit"
                         disabled={!replyMessage.trim()}
                         className={`px-5 py-2 font-bold text-sm rounded-full disabled:opacity-50 transition-all ${
                           transmitPulse ? "bg-success text-on-success scale-105" : "bg-primary text-on-primary"
                         }`}
                       >
                         Reply
                       </motion.button>
                    </div>
                 </div>
              </form>

              <div className="flex flex-col">
                {!selectedThread.replies || selectedThread.replies.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-on-surface-variant py-10">No replies yet. Be the first to reply.</p>
                ) : (
                  <div className="pt-2">
                    {selectedThread.replies.map((reply) => (
                      <div key={reply.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/30 transition-colors px-2 py-2 -mx-2 rounded-xl">
                        <ReplyNode
                          reply={reply}
                          depth={0}
                          onReplySubmit={(parentReplyId, message, imageUrl) =>
                            addReply(selectedThread.id, parentReplyId, message, imageUrl)
                          }
                          onReplyLike={(replyId) => likeReply(selectedThread.id, replyId)}
                          onReplyDelete={deleteReply}
                          onUserClick={handleUserClick}
                          userLikedReplies={userLikedReplies}
                          userProfile={userProfile}
                          uploadReplyImage={uploadReplyImage}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          ) : null}
        </AnimatePresence>
      </aside>

      {!loading &&
        portalMounted &&
        createPortal(
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={openCreateOverlay}
              className="fab-premium bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 sm:right-6 h-12 w-12 text-lg"
              aria-label="Create thread"
            >
              <Plus className="h-5 w-5" />
            </motion.button>

            <AnimatePresence>
              {isCreateOpen && (
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={fastFade}
                  className="fixed inset-0 z-199 bg-transparent p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-4"
                  onClick={closeCreateOverlay}
                >
                  <motion.div
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={modalSpring}
                    className="premium-scrollbar mx-auto max-h-[min(88dvh,760px)] max-w-2xl overflow-y-auto rounded-card shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {/* Sticky close button - always visible, never clipped by scroll */}
                    <div className="sticky top-0 z-20 flex justify-end px-3 pt-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={closeCreateOverlay}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest border border-outline-variant/30 shadow-sm hover:bg-surface-container-high transition-colors"
                      >
                        <X className="h-4 w-4 text-on-surface" />
                      </motion.button>
                    </div>
                    {userProfile ? (
                      <div>
                        <CreateThreadPanel
                          profile={{
                            id: userProfile.id,
                            username: userProfile.username,
                            avatar_url: userProfile.avatar_url,
                            fav_team: userProfile.fav_team
                          }}
                          onSuccess={() => {
                            refreshData();
                            closeCreateOverlay();
                          }}
                        />
                      </div>
                    ) : (
                      <div className="dashboard-panel p-5 text-center">
                        <button
                          type="button"
                          onClick={closeCreateOverlay}
                          className="btn-premium btn-outline-glass ml-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full p-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <h3 className="font-headline text-xl uppercase tracking-wider text-primary">Radio Silence</h3>
                        <p className="mt-2 font-mono text-sm uppercase tracking-widest text-on-surface-variant">
                          Log in to your Super License to broadcast.
                        </p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedProfileId && (
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={fastFade}
                  className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-4 flex items-center justify-center pointer-events-auto"
                  onClick={() => setSelectedProfileId("")}
                >
                  <motion.div
                    variants={modalPanelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={modalSpring}
                    className="w-full max-w-lg shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <UserDetailPanel 
                      profileId={selectedProfileId} 
                      onTeamAccent={(teamName) => applyTeamAccent(teamName)}
                      onBack={() => {
                        setSelectedProfileId("");
                      }} 
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </motion.div>
      )}
    </AnimatePresence>
  );
}
