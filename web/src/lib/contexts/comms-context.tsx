 "use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CommReply, CommThread } from "@/lib/types";

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
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
  comms_reply_likes: { count: number }[] | null;
};

type RawThread = {
  id: string;
  profile_id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
  comms_replies: RawReply[] | null;
  comms_thread_likes: { count: number }[] | null;
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

type CommsContextType = {
  threads: CommThread[];
  loading: boolean;
  isRefreshingThreads: boolean;
  hasMoreThreads: boolean;
  isLoadingMoreThreads: boolean;
  hasPendingNewComms: boolean;
  pendingNewCommsCount: number;
  userProfile: UserProfile | null;
  userLikedThreads: string[];
  userLikedReplies: string[];
  userBookmarkedThreads: string[];
  loadMoreThreads: () => Promise<void>;
  refreshThreads: (options?: { silent?: boolean; keepPending?: boolean }) => Promise<void>;
  clearPendingNewComms: () => void;
  refreshData: () => Promise<void>;
};

const CommsContext = createContext<CommsContextType | undefined>(undefined);

export function CommsProvider({ children }: { children: React.ReactNode }) {
  const PAGE_SIZE = 10;
  const REQUEST_TIMEOUT_MS = 12000;
  const [threads, setThreads] = useState<CommThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingThreads, setIsRefreshingThreads] = useState(false);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [isLoadingMoreThreads, setIsLoadingMoreThreads] = useState(false);
  const [hasPendingNewComms, setHasPendingNewComms] = useState(false);
  const [pendingNewCommsCount, setPendingNewCommsCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userLikedThreads, setUserLikedThreads] = useState<string[]>([]);
  const [userLikedReplies, setUserLikedReplies] = useState<string[]>([]);
  const [userBookmarkedThreads, setUserBookmarkedThreads] = useState<string[]>([]);
  const inFlightLoadMoreRef = useRef<Promise<void> | null>(null);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const hasInitialLoadCompletedRef = useRef(false);
  const threadsLengthRef = useRef(0);
  const currentUserIdRef = useRef("");

  useEffect(() => {
    threadsLengthRef.current = threads.length;
  }, [threads.length]);

  const withTimeout = useCallback(
    async <T,>(promise: PromiseLike<T>, label: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    },
    [REQUEST_TIMEOUT_MS],
  );

  const formatReplies = useCallback((replies: RawReply[]): CommReply[] => {
    const buildTree = (parentId: string | null): CommReply[] =>
      replies
        .filter((r) => r.parent_id === parentId)
        .map((r) => {
          const replyProfile = pickProfile(r.profiles);
          return {
            id: r.id,
            profileId: replyProfile.id,
            username: replyProfile.username,
            fullName: replyProfile.full_name,
            favDriver: replyProfile.fav_driver,
            favTeam: replyProfile.fav_team,
            avatarUrl: replyProfile.avatar_url,
            message: r.message,
            imageUrl: r.image_url?.startsWith("blob:") ? undefined : (r.image_url ?? undefined),
            likes: r.comms_reply_likes?.[0]?.count ?? 0,
            createdAt: r.created_at,
            replies: buildTree(r.id),
          };
        });

    return buildTree(null);
  }, []);

  const mapRawThreads = useCallback(
    (rawRows: RawThread[]): CommThread[] =>
      rawRows.map((threadRow) => {
        const threadProfile = pickProfile(threadRow.profiles);
        const replies = formatReplies(threadRow.comms_replies || []);
        return {
          id: threadRow.id,
          profileId: threadRow.profile_id,
          username: threadProfile.username,
          fullName: threadProfile.full_name,
          favDriver: threadProfile.fav_driver,
          favTeam: threadProfile.fav_team,
          avatarUrl: threadProfile.avatar_url,
          message: threadRow.message,
          imageUrl: threadRow.image_url?.startsWith("blob:") ? undefined : (threadRow.image_url ?? undefined),
          likes: threadRow.comms_thread_likes?.[0]?.count ?? 0,
          comments: countReplies(replies),
          createdAt: threadRow.created_at,
          replies,
        };
      }),
    [formatReplies],
  );

  const fetchThreadWindow = useCallback(
    async (start: number, requestedCount: number) => {
      const fetchCount = requestedCount + 1;
      const end = start + fetchCount - 1;
      const { data, error } = await withTimeout(
        supabase
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
          .order("created_at", { ascending: false })
          .range(start, end),
        "Comms thread fetch",
      );

      if (error) throw error;
      const rows = (data ?? []) as RawThread[];
      const hasMore = rows.length > requestedCount;
      const sliced = hasMore ? rows.slice(0, requestedCount) : rows;
      return {
        threads: mapRawThreads(sliced),
        hasMore,
      };
    },
    [mapRawThreads, withTimeout],
  );

  const fetchUserProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUserIdRef.current = user.id;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setUserProfile(data);

      try {
        const { data: threadLikes } = await supabase.from('comms_thread_likes').select('thread_id').eq('profile_id', user.id);
        if (threadLikes) setUserLikedThreads(Array.from(new Set(threadLikes.map(l => l.thread_id))));
      } catch { }

      try {
        const { data: replyLikes } = await supabase.from('comms_reply_likes').select('reply_id').eq('profile_id', user.id);
        if (replyLikes) setUserLikedReplies(Array.from(new Set(replyLikes.map(l => l.reply_id))));
      } catch { }

      try {
        const { data: threadBookmarks } = await supabase.from('comms_thread_bookmarks').select('thread_id').eq('profile_id', user.id);
        if (threadBookmarks) setUserBookmarkedThreads(Array.from(new Set(threadBookmarks.map((b) => b.thread_id))));
      } catch { }
    } else {
      currentUserIdRef.current = "";
      setUserProfile(null);
      setUserLikedThreads([]);
      setUserLikedReplies([]);
      setUserBookmarkedThreads([]);
    }
  }, []);

  const refreshThreads = useCallback(async (options?: { silent?: boolean; keepPending?: boolean }) => {
    const silent = Boolean(options?.silent);
    const keepPending = Boolean(options?.keepPending);
    if (inFlightRefreshRef.current) {
      await inFlightRefreshRef.current;
      return;
    }

    const task = (async () => {
      const showBlockingLoading = !hasInitialLoadCompletedRef.current && !silent;
      const requestedCount = Math.max(PAGE_SIZE, threadsLengthRef.current || PAGE_SIZE);

      if (showBlockingLoading) {
        setLoading(true);
      } else {
        setIsRefreshingThreads(true);
      }

      try {
        const page = await fetchThreadWindow(0, requestedCount);
        setThreads(page.threads);
        setHasMoreThreads(page.hasMore);
        if (!keepPending) {
          setHasPendingNewComms(false);
          setPendingNewCommsCount(0);
        }
        hasInitialLoadCompletedRef.current = true;
      } catch (err) {
        console.error("Error fetching threads:", err);
      } finally {
        if (showBlockingLoading) {
          setLoading(false);
        } else {
          setIsRefreshingThreads(false);
        }
      }
    })();

    inFlightRefreshRef.current = task;
    try {
      await task;
    } finally {
      inFlightRefreshRef.current = null;
    }
  }, [fetchThreadWindow, PAGE_SIZE]);

  const loadMoreThreads = useCallback(async () => {
    if (loading || isRefreshingThreads || isLoadingMoreThreads || !hasMoreThreads) return;
    if (inFlightLoadMoreRef.current) {
      await inFlightLoadMoreRef.current;
      return;
    }

    const currentCount = threads.length;
    const task = (async () => {
      try {
        setIsLoadingMoreThreads(true);
        const page = await fetchThreadWindow(currentCount, PAGE_SIZE);
        setThreads((prev) => {
          const existingIds = new Set(prev.map((threadItem) => threadItem.id));
          const appended = page.threads.filter((threadItem) => !existingIds.has(threadItem.id));
          return [...prev, ...appended];
        });
        setHasMoreThreads(page.hasMore);
      } catch (err) {
        console.error("Error loading more threads:", err);
      } finally {
        setIsLoadingMoreThreads(false);
      }
    })();

    inFlightLoadMoreRef.current = task;
    try {
      await task;
    } finally {
      inFlightLoadMoreRef.current = null;
    }
  }, [PAGE_SIZE, fetchThreadWindow, hasMoreThreads, isLoadingMoreThreads, isRefreshingThreads, loading, threads.length]);

  const refreshData = useCallback(async () => {
    await refreshThreads({ keepPending: false });
    await fetchUserProfile();
  }, [refreshThreads, fetchUserProfile]);

  const clearPendingNewComms = useCallback(() => {
    setHasPendingNewComms(false);
    setPendingNewCommsCount(0);
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const channel = supabase
      .channel("paddock-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "comms_threads" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const insertProfileId = (payload.new as { profile_id?: string } | null)?.profile_id ?? "";
          const isOwnInsert = insertProfileId && insertProfileId === currentUserIdRef.current;
          if (!isOwnInsert) {
            setHasPendingNewComms(true);
            setPendingNewCommsCount((prev) => prev + 1);
            return;
          }
          void refreshThreads({ silent: true, keepPending: true });
          return;
        }

        if (payload.eventType === "DELETE") {
          void refreshThreads({ silent: true, keepPending: true });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchUserProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "comms_thread_bookmarks" }, (payload) => {
        const payloadProfileId =
          ((payload.new as { profile_id?: string } | null)?.profile_id ?? "") ||
          ((payload.old as { profile_id?: string } | null)?.profile_id ?? "");
        if (payloadProfileId && payloadProfileId === currentUserIdRef.current) {
          void fetchUserProfile();
        }
      })
      .subscribe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchUserProfile();
      void refreshThreads({ silent: true, keepPending: true });
    });

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, refreshThreads]);

  useEffect(() => {
    if (threads.length > 0) return;
    setHasMoreThreads(true);
  }, [threads.length]);

  useEffect(() => {
    if (!hasPendingNewComms && pendingNewCommsCount !== 0) {
      setPendingNewCommsCount(0);
    }
  }, [hasPendingNewComms, pendingNewCommsCount]);

  const value = useMemo(
    () => ({
      threads,
      loading,
      isRefreshingThreads,
      hasMoreThreads,
      isLoadingMoreThreads,
      hasPendingNewComms,
      pendingNewCommsCount,
      userProfile,
      userLikedThreads,
      userLikedReplies,
      userBookmarkedThreads,
      loadMoreThreads,
      refreshThreads,
      clearPendingNewComms,
      refreshData,
    }),
    [
      clearPendingNewComms,
      hasMoreThreads,
      hasPendingNewComms,
      isLoadingMoreThreads,
      isRefreshingThreads,
      loadMoreThreads,
      loading,
      pendingNewCommsCount,
      refreshData,
      refreshThreads,
      threads,
      userLikedReplies,
      userLikedThreads,
      userBookmarkedThreads,
      userProfile,
    ],
  );

  return (
    <CommsContext.Provider value={value}>
      {children}
    </CommsContext.Provider>
  );
}

export function useComms() {
  const context = useContext(CommsContext);
  if (context === undefined) {
    throw new Error("useComms must be used within a CommsProvider");
  }
  return context;
}
