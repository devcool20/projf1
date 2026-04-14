"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
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
  userProfile: UserProfile | null;
  userLikedThreads: string[];
  userLikedReplies: string[];
  refreshData: () => Promise<void>;
};

const CommsContext = createContext<CommsContextType | undefined>(undefined);

export function CommsProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = useState<CommThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userLikedThreads, setUserLikedThreads] = useState<string[]>([]);
  const [userLikedReplies, setUserLikedReplies] = useState<string[]>([]);

  const fetchUserProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
    } else {
      setUserProfile(null);
      setUserLikedThreads([]);
      setUserLikedReplies([]);
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      if (threads.length === 0) setLoading(true);
      const { data, error } = await supabase
        .from('comms_threads')
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatReplies = (replies: RawReply[]): CommReply[] => {
        const buildTree = (parentId: string | null): CommReply[] => {
          return replies
            .filter(r => r.parent_id === parentId)
            .map(r => {
              const replyProfile = pickProfile(r.profiles);
              return {
                id: r.id, profileId: replyProfile.id, username: replyProfile.username, fullName: replyProfile.full_name,
                favDriver: replyProfile.fav_driver, favTeam: replyProfile.fav_team, avatarUrl: replyProfile.avatar_url,
                message: r.message, imageUrl: r.image_url?.startsWith('blob:') ? undefined : (r.image_url ?? undefined),
                likes: r.comms_reply_likes?.[0]?.count ?? 0, createdAt: r.created_at, replies: buildTree(r.id)
              };
            });
        };
        return buildTree(null);
      };
 
      const formatted: CommThread[] = ((data ?? []) as RawThread[]).map(t => {
        const threadProfile = pickProfile(t.profiles);
        const replies = formatReplies(t.comms_replies || []);
        return {
          id: t.id, profileId: t.profile_id, username: threadProfile.username, fullName: threadProfile.full_name,
          favDriver: threadProfile.fav_driver, favTeam: threadProfile.fav_team, avatarUrl: threadProfile.avatar_url,
          message: t.message, imageUrl: t.image_url?.startsWith('blob:') ? undefined : (t.image_url ?? undefined),
          likes: t.comms_thread_likes?.[0]?.count ?? 0, comments: countReplies(replies), createdAt: t.created_at, replies
        };
      });

      setThreads(formatted);
    } catch (err) {
      console.error("Error fetching threads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchThreads();
    await fetchUserProfile();
  }, [fetchThreads, fetchUserProfile]);

  useEffect(() => {
    refreshData();

    const channel = supabase.channel('paddock-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comms_threads' }, () => fetchThreads())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUserProfile())
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchUserProfile());

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [refreshData, fetchThreads, fetchUserProfile]);

  return (
    <CommsContext.Provider value={{ threads, loading, userProfile, userLikedThreads, userLikedReplies, refreshData }}>
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
