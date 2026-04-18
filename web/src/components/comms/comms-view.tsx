"use client";

import { CommReply, CommThread } from "@/lib/types";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState, useCallback, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { CreateThreadPanel } from "./create-thread-panel";
import { UserDetailPanel } from "./user-detail-panel";
import { LikeButton, BookmarkButton } from "./micro-interactions";
import {
  ArrowPathIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  HeartIcon,
  PhotoIcon,
  PlusIcon,
  ShareIcon,
  SignalIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { applyTeamAccent, resetTeamAccent, getTeamColor } from "@/lib/team-accent";
import { fastFade, listContainerVariants, listItemVariants, modalSpring, overlayVariants, modalPanelVariants } from "@/components/motion/premium-motion";
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
  likes_count?: number;
  comms_reply_likes?: { count: number }[] | null;
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
};

type RawThread = {
  id: string;
  profile_id: string;
  message: string;
  image_url: string | null;
  likes_count?: number;
  comments_count?: number;
  comms_thread_likes?: { count: number }[] | null;
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

function formatRepliesFromRaw(replies: RawReply[]): CommReply[] {
  const buildTree = (parentId: string | null): CommReply[] =>
    replies
      .filter((reply) => reply.parent_id === parentId)
      .map((reply) => {
        const profile = pickProfile(reply.profiles);
        return {
          id: reply.id,
          profileId: profile.id,
          username: profile.username,
          fullName: profile.full_name,
          favDriver: profile.fav_driver,
          favTeam: profile.fav_team,
          avatarUrl: profile.avatar_url,
          message: reply.message,
          imageUrl: reply.image_url?.startsWith("blob:") ? undefined : (reply.image_url ?? undefined),
          likes: reply.comms_reply_likes?.[0]?.count ?? reply.likes_count ?? 0,
          createdAt: reply.created_at,
          replies: buildTree(reply.id),
        };
      });

  return buildTree(null);
}

function mapRawThreadToCommThread(rawThread: RawThread): CommThread {
  const profile = pickProfile(rawThread.profiles);
  const replies = formatRepliesFromRaw(rawThread.comms_replies ?? []);
  return {
    id: rawThread.id,
    profileId: rawThread.profile_id,
    username: profile.username,
    fullName: profile.full_name,
    favDriver: profile.fav_driver,
    favTeam: profile.fav_team,
    avatarUrl: profile.avatar_url,
    message: rawThread.message,
    imageUrl: rawThread.image_url?.startsWith("blob:") ? undefined : (rawThread.image_url ?? undefined),
    likes: rawThread.comms_thread_likes?.[0]?.count ?? rawThread.likes_count ?? 0,
    comments: countReplies(replies),
    createdAt: rawThread.created_at,
    replies,
  };
}

function getDisplayMessage(message: string | null | undefined): string {
  const normalized = typeof message === "string" ? message.trim() : "";
  return normalized.length > 0 ? message! : "No content provided";
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

function ImageWithLoader({
  src,
  alt,
  className = "",
  containerClass = "",
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  containerClass?: string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClass}`}>
      {!isLoaded && !isError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-low">
          <ArrowPathIcon className="h-4 w-4 animate-spin text-on-surface-variant" />
        </div>
      )}

      <img
        key={src}
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
        onClick={onClick}
        className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity`}
      />

      {isError && <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-on-surface-variant">Image unavailable</div>}
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
              <ImageWithLoader src={reply.avatarUrl} alt={reply.fullName} className="h-full w-full object-cover" containerClass="h-full w-full" />
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
            <span className="font-semibold text-sm text-slate-900 truncate">{reply.fullName}</span>
            <span className="text-xs text-slate-700 truncate">@{reply.username?.replace(/^@/, '')}</span>
            <span className="text-[10px] text-slate-600 font-mono shrink-0 ml-0.5">{formatTimeAgo(reply.createdAt)}</span>
          </button>

          {userProfile?.id === reply.profileId && (
            <button
              onClick={(e) => { e.stopPropagation(); onReplyDelete(reply.id, depth > 0); }}
              className="text-on-surface-variant/85 hover:text-red-400 p-1.5 rounded-full hover:bg-red-400/10 transition-colors shrink-0"
              title="Delete"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        <p className="mt-1 text-sm font-medium leading-normal text-slate-600!">{getDisplayMessage(reply.message)}</p>

        {reply.imageUrl && (
          <div className="relative mt-3 w-full overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-dim">
            <ImageWithLoader
              src={reply.imageUrl}
              alt="Reply attachment"
              containerClass="relative"
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
              <HeartIcon className={`h-4 w-4 ${userLikedReplies.includes(reply.id) ? "fill-primary" : ""}`} />
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
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
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
                        <ImageWithLoader src={userProfile.avatar_url} alt={userProfile.username} className="h-full w-full object-cover" containerClass="h-full w-full" />
                      ) : (
                        userProfile?.username?.replace(/^@/, '')[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />
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
                        className="p-2 text-on-surface-variant hover:text-secondary transition-colors"
                      >
                        <PhotoIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {replyImagePreview && (
                    <div className="relative w-full overflow-hidden rounded-xl border border-outline-variant/30 max-w-[200px]">
                      <ImageWithLoader src={replyImagePreview} alt="Preview" className="w-full h-auto max-h-40 object-cover" containerClass="relative" />
                      <button
                        type="button"
                        onClick={() => { setReplyImageFile(null); setReplyImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                      >
                        <XMarkIcon className="h-3 w-3" />
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
                      {isSubmitting ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : "Reply"}
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
  const [userBookmarkedThreads, setUserBookmarkedThreads] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likeBurstThread, setLikeBurstThread] = useState<string | null>(null);
  const [transmitPulse, setTransmitPulse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isRefreshingNewComms, setIsRefreshingNewComms] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isLoadingBookmarkThreads, setIsLoadingBookmarkThreads] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightLikesRef = useState(() => new Set<string>())[0];
  const inFlightBookmarksRef = useState(() => new Set<string>())[0];
  const [isMobileView, setIsMobileView] = useState(false);

  const {
    threads: globalThreads,
    loading: globalLoading,
    hasMoreThreads,
    isLoadingMoreThreads,
    hasPendingNewComms,
    pendingNewCommsCount,
    userProfile: globalProfile,
    userLikedThreads: globalLikedThreads,
    userLikedReplies: globalLikedReplies,
    userBookmarkedThreads: globalBookmarkedThreads,
    loadMoreThreads,
    refreshThreads,
    clearPendingNewComms,
  } = useComms();

  useEffect(() => {
    setThreads(globalThreads);
    setLoading(globalLoading);
  }, [globalThreads, globalLoading]);

  useEffect(() => {
    setUserProfile(globalProfile);
    setUserLikedThreads(globalLikedThreads);
    setUserLikedReplies(globalLikedReplies);
    setUserBookmarkedThreads(globalBookmarkedThreads);
  }, [globalBookmarkedThreads, globalLikedReplies, globalLikedThreads, globalProfile]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const updateMatch = (matches: boolean) => {
      setIsMobileView(Boolean(matches));
    };

    const onMatch = (event: MediaQueryListEvent) => {
      updateMatch(event.matches);
    };

    updateMatch(mq.matches);

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onMatch);
      return () => mq.removeEventListener("change", onMatch);
    }

    mq.addListener(onMatch);
    return () => mq.removeListener(onMatch);
  }, []);

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
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      if (threadId) params.set("t", threadId);
      else params.delete("t");
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      // Mobile: avoid App Router query churn that can cause drawer jitter.
      if (isMobileView && typeof window !== "undefined") {
        if (mode === "replace") window.history.replaceState({}, "", nextUrl);
        else window.history.pushState({}, "", nextUrl);
        return;
      }
      if (mode === "replace") router.replace(nextUrl, { scroll: false });
      else router.push(nextUrl, { scroll: false });
    },
    [isMobileView, pathname, router],
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
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const threadId = params.get("t") ?? "";
      setSelectedThreadId((current) => (current === threadId ? current : threadId));
      if (threadId) setRightPanelMode("detail");
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

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
    
    void refreshThreads({ silent: true, keepPending: true });
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
    
    void refreshThreads({ silent: true, keepPending: true });
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
    if (query.trim()) return;
    if (!hasMoreThreads) return;
    if (isLoadingMoreThreads) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          void loadMoreThreads();
        }
      },
      { rootMargin: "240px 0px 240px 0px", threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreThreads, isLoadingMoreThreads, loadMoreThreads, query, filtered.length]);

  const refreshForNewComms = useCallback(async () => {
    if (isRefreshingNewComms) return;
    setIsRefreshingNewComms(true);
    try {
      await refreshThreads({ silent: true, keepPending: false });
      clearPendingNewComms();
      setToast("Comms refreshed");
      setTimeout(() => setToast(null), 1300);
    } finally {
      setIsRefreshingNewComms(false);
    }
  }, [clearPendingNewComms, isRefreshingNewComms, refreshThreads]);

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
    void refreshThreads({ silent: true, keepPending: true });
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
      // Keep optimistic thread state and avoid refetch flicker.
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
      // Keep optimistic reply state and avoid refetch flicker.
    }
  };

  const toggleBookmarkThread = async (threadId: string) => {
    if (!userProfile) return;
    const targetThread = threads.find((thread) => thread.id === threadId);
    if (targetThread?.profileId === userProfile.id) return;

    const lockKey = `bookmark:${threadId}`;
    if (inFlightBookmarksRef.has(lockKey)) return;
    inFlightBookmarksRef.add(lockKey);

    const isBookmarkedLocally = userBookmarkedThreads.includes(threadId);
    const intendedToBookmark = !isBookmarkedLocally;

    setUserBookmarkedThreads((prev) =>
      intendedToBookmark ? Array.from(new Set([...prev, threadId])) : prev.filter((id) => id !== threadId),
    );

    try {
      const { error } = await supabase.rpc("handle_thread_bookmark", {
        p_thread_id: threadId,
        p_profile_id: userProfile.id,
        p_intended_to_bookmark: intendedToBookmark,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error toggling thread bookmark:", error);
      setUserBookmarkedThreads((prev) =>
        !intendedToBookmark ? Array.from(new Set([...prev, threadId])) : prev.filter((id) => id !== threadId),
      );
      setToast("Bookmark sync failed");
      setTimeout(() => setToast(null), 1400);
    } finally {
      inFlightBookmarksRef.delete(lockKey);
    }
  };

  const loadMissingBookmarkedThreads = useCallback(async () => {
    const missingThreadIds = userBookmarkedThreads.filter((id) => !threads.some((thread) => thread.id === id));
    if (!missingThreadIds.length) return;

    setIsLoadingBookmarkThreads(true);
    try {
      const { data, error } = await supabase
        .from("comms_threads")
        .select(`
          id, profile_id, message, image_url, created_at,
          profiles (id, username, full_name, fav_driver, fav_team, avatar_url),
          comms_thread_likes (count),
          comms_replies (
            id, thread_id, parent_id, message, image_url, created_at,
            profiles (id, username, full_name, fav_driver, fav_team, avatar_url),
            comms_reply_likes (count)
          )
        `)
        .in("id", missingThreadIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const fetchedThreads = ((data ?? []) as RawThread[]).map(mapRawThreadToCommThread);
      if (!fetchedThreads.length) return;

      setThreads((prev) => {
        const prevIds = new Set(prev.map((thread) => thread.id));
        const merged = [...fetchedThreads.filter((thread) => !prevIds.has(thread.id)), ...prev];
        return merged;
      });
    } catch (error) {
      console.error("Error loading bookmarked threads:", error);
    } finally {
      setIsLoadingBookmarkThreads(false);
    }
  }, [threads, userBookmarkedThreads]);

  const openBookmarksOverlay = useCallback(async () => {
    setIsBookmarksOpen(true);
    await loadMissingBookmarkedThreads();
  }, [loadMissingBookmarkedThreads]);

  const bookmarkedThreads = useMemo(
    () =>
      userBookmarkedThreads
        .map((id) => threads.find((thread) => thread.id === id))
        .filter((thread): thread is CommThread => Boolean(thread))
        .filter((thread) => !userProfile || thread.profileId !== userProfile.id),
    [threads, userBookmarkedThreads, userProfile],
  );

  const openBookmarkedThread = useCallback(
    (threadId: string) => {
      setIsBookmarksOpen(false);
      openThreadDetail(threadId);
    },
    [openThreadDetail],
  );

  const desktopDetailRailWidth = "calc(min(440px, 34vw) + 1.5rem)";

  return (
    <AnimatePresence initial={false} mode="sync">
      {loading ? (
        <motion.div
          key="comms-loading"
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0 }}
          className="comms-light-theme grid gap-4 md:grid-cols-2 md:grid-flow-dense"
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
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fastFade}
      className="comms-light-theme grid grid-cols-12 gap-3 sm:gap-4"
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
      <section
        className={`col-span-12 ${selectedThreadId ? "hidden xl:block" : "block"}`}
        style={selectedThreadId && !isMobileView ? { paddingRight: desktopDetailRailWidth } : undefined}
      >
        <div className="mb-4 flex items-end justify-between border-b border-primary/20 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80">Transmission Feed</p>
            <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">The Grid</h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              {filtered.length} active comms
            </p>
            <button
              type="button"
              onClick={() => {
                void openBookmarksOverlay();
              }}
              className="btn-premium btn-outline-glass flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
              title="Open bookmarks"
            >
              <BookmarkIcon className="h-3.5 w-3.5" />
              Saved
              {userBookmarkedThreads.length > 0 && (
                <span className="rounded-full border border-primary/35 px-1.5 py-0.5 text-[9px] text-primary/90">
                  {userBookmarkedThreads.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {hasPendingNewComms && !query.trim() && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={refreshForNewComms}
            className="btn-premium btn-outline-glass mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
          >
            {isRefreshingNewComms ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
            Refresh for new comms
            {pendingNewCommsCount > 0 && (
              <span className="rounded-full border border-primary/35 px-2 py-0.5 text-[9px] text-primary/90">
                +{pendingNewCommsCount}
              </span>
            )}
          </motion.button>
        )}

        <motion.div
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:grid-flow-dense"
          variants={listContainerVariants}
          initial={false}
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
                whileHover={{ backgroundColor: "rgba(241,245,249,0.82)" }}
                style={isSelectedCard ? {
                  backgroundColor: "rgba(237, 233, 254, 0.75)",
                  boxShadow: "0 8px 20px rgba(99, 102, 241, 0.12)",
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
                            <ImageWithLoader src={thread.avatarUrl} alt={thread.fullName} className="h-full w-full object-cover" containerClass="h-full w-full" />
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
                            className="font-bold text-sm text-slate-900 hover:underline transition-colors text-left"
                          >
                            {thread.fullName}
                          </button>
                          <p className="text-sm font-semibold text-slate-700 shrink-0">
                            @{thread.username?.replace(/^@/, '')}
                          </p>
                          <span className="text-sm text-slate-600" aria-hidden>·</span>
                          <span className="text-xs text-slate-600 shrink-0">
                            {formatTimeAgo(thread.createdAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {score > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/20">
                              <SignalIcon className="h-2.5 w-2.5" style={{ color: signal.color }} />
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
                        className="text-on-surface-variant/85 hover:text-alert-red hover:bg-alert-red/10 flex h-7 w-7 items-center justify-center rounded-full transition-colors shrink-0"
                        title="Terminate Broadcast"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 ml-13 sm:ml-13 pr-2">
                    <p className="text-[15px] sm:text-base font-semibold leading-normal text-slate-600!">{getDisplayMessage(thread.message)}</p>
                  </div>
                </div>

                {hasImage && (
                  <div 
                    onClick={() => openThreadDetail(thread.id)}
                    className="w-full overflow-hidden cursor-pointer mt-2 mb-1 px-4"
                  >
                    <ImageWithLoader
                      src={thread.imageUrl!}
                      alt="Thread preview"
                      className="w-full h-auto object-cover max-h-56 rounded-xl border border-outline-variant/20 shadow-sm"
                      containerClass="relative"
                    />
                  </div>
                )}

                <div className="px-4 pb-3 flex items-center gap-5 ml-13 border-t border-outline-variant/5 pt-2 mt-2">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <LikeButton
                      liked={userLikedThreads.includes(thread.id)}
                      count={thread.likes}
                      onToggle={() => likeThread(thread.id)}
                      size="sm"
                    />
                  </div>
                  <div className="group flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-secondary transition-colors cursor-pointer" onClick={() => openThreadDetail(thread.id)}>
                     <div className="flex h-7 w-7 items-center justify-center rounded-full group-hover:bg-secondary/10 transition-colors">
                       <ChatBubbleLeftRightIcon className="h-4 w-4" />
                     </div>
                     {thread.comments > 0 && <span>{thread.comments}</span>}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void shareThread(thread);
                    }}
                    className="group flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-secondary transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full group-hover:bg-secondary/10 transition-colors">
                      <ShareIcon className="h-4 w-4" />
                    </div>
                    {shareState === "copied" ? <span>Copied</span> : null}
                  </motion.button>
                  {Boolean(userProfile?.id) && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <BookmarkButton
                        bookmarked={userBookmarkedThreads.includes(thread.id)}
                        onToggle={() => void toggleBookmarkThread(thread.id)}
                        disabled={thread.profileId === userProfile?.id}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        {!query.trim() && hasMoreThreads && <div ref={loadMoreSentinelRef} className="mt-2 h-1 w-full" aria-hidden />}
        {!query.trim() && isLoadingMoreThreads && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            Loading more comms
          </div>
        )}
      </section>

      {portalMounted &&
        createPortal(
          <>
            <AnimatePresence>
              {!!selectedThreadId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={isMobileView ? { duration: 0.18, ease: [0.22, 1, 0.36, 1] } : fastFade}
                  className="fixed inset-0 z-50 bg-white/70 xl:hidden"
                  onClick={closeThreadDetail}
                />
              )}
            </AnimatePresence>
            <aside
              className={`mx-auto w-full max-w-2xl ${
                !!selectedThreadId
                  ? "fixed inset-0 z-60 bg-white/82 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:inset-y-5 xl:left-auto xl:right-6 xl:w-[min(440px,34vw)] xl:max-w-none xl:bg-transparent xl:p-0"
                  : "hidden"
              }`}
              onClick={!!selectedThreadId && isMobileView ? closeThreadDetail : undefined}
            >
              <AnimatePresence initial={false} mode="wait">
                {selectedThread ? (
                  <motion.div
                    key={selectedThread.id}
                    {...(isMobileView
                      ? {
                          initial: { x: "100%", opacity: 1 },
                          animate: { x: "0%", opacity: 1 },
                          exit: { x: "100%", opacity: 1 },
                          transition: { type: "spring", stiffness: 410, damping: 42, mass: 0.9 },
                        }
                      : {
                          initial: { x: 30, opacity: 0.96 },
                          animate: { x: 0, opacity: 1 },
                          exit: { x: 30, opacity: 0.96 },
                          transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                        })}
                    className="dashboard-panel premium-scrollbar h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-card p-4 sm:p-5 xl:h-[calc(100dvh-2.5rem)] xl:overflow-y-auto"
                    style={
                      isMobileView
                        ? {
                            willChange: "transform",
                            transform: "translateZ(0)",
                            backfaceVisibility: "hidden",
                          }
                        : undefined
                    }
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
                  <ChevronLeftIcon className="h-4 w-4 text-on-surface" />
                </motion.button>
                <h2 className="font-bold text-lg text-on-surface">Post</h2>
              </div>

              {userProfile?.id === selectedThread.profileId && (
                <button
                  type="button"
                  onClick={() => deleteThread(selectedThread.id)}
                  className="text-on-surface-variant/85 hover:text-alert-red hover:bg-alert-red/10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  title="Purge Signal"
                >
                  <TrashIcon className="h-4 w-4" />
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
                      <ImageWithLoader src={selectedThread.avatarUrl} alt={selectedThread.fullName} className="h-full w-full object-cover" containerClass="h-full w-full" />
                    ) : (
                      selectedThread.username?.replace(/^@/, '')[0]?.toUpperCase()
                    )}
                  </button>
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleUserClick(selectedThread.profileId)}
                      className="font-bold text-[1rem] hover:underline transition-all text-slate-900 text-left leading-tight"
                    >
                      {selectedThread.fullName}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-slate-700">
                        @{selectedThread.username?.replace(/^@/, '')}
                      </span>
                    </div>
                  </div>
              </div>

              <div className="mt-3 pt-2">
                <p className="text-[15px] sm:text-base font-semibold leading-relaxed whitespace-pre-wrap text-slate-600!">{getDisplayMessage(selectedThread.message)}</p>
              </div>

              {selectedThread.imageUrl && (
                <div className="relative mt-4 w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-dim">
                   <ImageWithLoader
                     src={selectedThread.imageUrl}
                     alt="Thread attachment"
                     className="w-full h-auto object-contain max-h-[60vh]"
                     containerClass="relative"
                   />
                </div>
              )}

              {/* Signal Score - Minimized */}
              {(() => {
                const detailScore = computeSignalScore(selectedThread);
                const detailSignal = getSignalLabel(detailScore);
                if (detailScore > 0) return (
                  <div className="mt-4 flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 w-fit">
                    <SignalIcon className="h-3 w-3" style={{ color: detailSignal.color }} />
                    <span className="text-xs text-on-surface-variant font-mono">
                      Signal <strong style={{ color: detailSignal.color }}>{detailScore}</strong>
                    </span>
                  </div>
                );
                return null;
              })()}

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-700 border-b border-outline-variant/20 pb-4">
                <span>{formatTimeAgo(selectedThread.createdAt)}</span>
              </div>

              <div className="flex items-center justify-around py-2 border-b border-outline-variant/20">
                <LikeButton
                  liked={userLikedThreads.includes(selectedThread.id)}
                  count={selectedThread.likes}
                  onToggle={() => likeThread(selectedThread.id)}
                  size="md"
                />

                <div className="group flex items-center gap-2 text-sm text-slate-700">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  </div>
                  {selectedThread.comments > 0 && <span>{selectedThread.comments}</span>}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => shareThread(selectedThread)}
                  className="group flex items-center gap-2 text-sm text-slate-700 hover:text-secondary transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full group-hover:bg-secondary/10 transition-colors">
                    <ShareIcon className="h-5 w-5" />
                  </div>
                  {shareState === "copied" ? "Copied" : ""}
                </motion.button>
                {Boolean(userProfile?.id) && (
                  <BookmarkButton
                    bookmarked={userBookmarkedThreads.includes(selectedThread.id)}
                    onToggle={() => void toggleBookmarkThread(selectedThread.id)}
                    disabled={selectedThread.profileId === userProfile?.id}
                    size="md"
                  />
                )}
              </div>

              {/* Composition Box for main thread reply */}
              <form onSubmit={submitThreadReply} className="py-4 border-b border-outline-variant/20 flex gap-3">
                <div 
                  onClick={() => handleUserClick(userProfile?.id || "")}
                  className="flex h-14 w-14 shrink-0 overflow-hidden items-center justify-center rounded-full bg-surface-container-high border-2 border-outline-variant/30 text-on-surface font-headline text-xl cursor-pointer hover:border-primary transition-colors"
                >
                  {userProfile?.avatar_url ? (
                     <ImageWithLoader src={userProfile.avatar_url} alt={userProfile.full_name} className="h-full w-full object-cover" containerClass="h-full w-full" />
                  ) : (
                     userProfile?.username?.replace(/^@/, '')[0]?.toUpperCase() || <UserIcon className="h-6 w-6 text-on-surface-variant"/>
                  )}
                </div>
                 <div className="flex-1 space-y-3">
                    <textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      className="w-full resize-none bg-transparent pt-3 text-lg text-on-surface outline-none placeholder:text-on-surface-variant/85"
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
                         <ImageWithLoader src={replyImagePreview} alt="Preview" className="w-full h-auto max-h-40 object-cover" containerClass="relative" />
                         <button
                           type="button"
                           onClick={() => { setReplyImageFile(null); setReplyImagePreview(null); if (replyFileInputRef.current) replyFileInputRef.current.value = ""; }}
                           className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                         >
                           <XMarkIcon className="h-3 w-3" />
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
          </>,
          document.body,
        )}

      <AnimatePresence>
        {isBookmarksOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastFade}
            className="comms-light-theme fixed inset-0 z-180 bg-white/72 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-4"
            onClick={() => setIsBookmarksOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={modalSpring}
              className="dashboard-panel premium-scrollbar mx-auto h-[calc(100dvh-8rem)] w-full max-w-2xl overflow-y-auto rounded-card p-4 sm:p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Comms Bookmarks</p>
                  <h3 className="font-headline text-xl font-semibold text-on-surface">Saved Threads</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookmarksOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors"
                  aria-label="Close bookmarks"
                >
                  <XMarkIcon className="h-4 w-4 text-on-surface" />
                </button>
              </div>

              {isLoadingBookmarkThreads ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-on-surface-variant">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Loading saved threads
                </div>
              ) : bookmarkedThreads.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant">No saved threads yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarkedThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => openBookmarkedThread(thread.id)}
                      className="card-surface w-full border border-outline-variant/25 p-4 text-left transition hover:border-primary/35"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-on-surface">{thread.fullName}</p>
                          <p className="truncate text-xs text-on-surface-variant">@{thread.username?.replace(/^@/, "")}</p>
                        </div>
                        <BookmarkIcon className="h-4 w-4 shrink-0 fill-primary text-primary" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600!">{getDisplayMessage(thread.message)}</p>
                      <div className="mt-2 text-[11px] text-on-surface-variant">{formatTimeAgo(thread.createdAt)}</div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <PlusIcon className="h-5 w-5" />
            </motion.button>

            <AnimatePresence>
              {isCreateOpen && (
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={fastFade}
                  className="comms-light-theme fixed inset-0 z-199 bg-transparent p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-4"
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
                        <XMarkIcon className="h-4 w-4 text-on-surface" />
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
                            void refreshThreads({ silent: true, keepPending: true });
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
                          <XMarkIcon className="h-4 w-4" />
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
                  className="comms-light-theme fixed inset-0 z-200 bg-white/75 backdrop-blur-sm p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-4 flex items-center justify-center pointer-events-auto"
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
