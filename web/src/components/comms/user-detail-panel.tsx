"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ChevronLeft, MapPin, Trophy, Signal, Clock, Heart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { DriverVideo } from "@/components/ui/driver-video";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  fav_team: string | null;
  fav_driver: string | null;
  points: number;
};

type Props = {
  profileId: string;
  onBack: () => void;
};

export function UserDetailPanel({ profileId, onBack }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comms, setComms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      
      if (profileData) setProfile(profileData);

      const { data: commsData } = await supabase
        .from("comms_threads")
        .select(`id, message, likes_count, comments_count, created_at, image_url`)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (commsData) setComms(commsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (loading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Syncing Profile Data...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="dashboard-panel p-5"
    >
      <div className="flex items-center gap-3 border-b border-primary/20 pb-4 mb-5">
        <button 
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Intelligence Profile</p>
          <p className="font-headline text-lg mt-1">{profile.username}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative overflow-hidden rounded bg-surface-container-low p-4 flex items-center gap-4">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
          
          <DriverVideo driverName={profile.fav_driver} className="w-16 h-16 shrink-0" />
          
          <div className="flex-1 min-w-0 z-10">
            <h3 className="font-headline text-2xl font-bold truncate">{profile.full_name}</h3>
            
            <div className="mt-2 flex gap-4">
              <div className="space-y-0.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">Team</p>
                <p className="font-mono text-xs text-primary truncate">{profile.fav_team || "Independent"}</p>
              </div>
              <div className="space-y-0.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">Driver</p>
                <p className="font-mono text-xs text-secondary truncate">{profile.fav_driver || "None"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-outline-variant/20 bg-surface-container-low p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-3 w-3 text-primary" />
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant">Career Points</p>
            </div>
            <p className="font-mono text-xl text-primary">{profile.points}</p>
          </div>
          <div className="border border-outline-variant/20 bg-surface-container-low p-3">
            <div className="flex items-center gap-2 mb-1">
              <Signal className="h-3 w-3 text-secondary" />
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant">License Level</p>
            </div>
            <p className="font-mono text-xl text-secondary">A-Class</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary border-b border-outline-variant/10 pb-2">Recent Transmissions</h4>
          {comms.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No data transmissions found.</p>
          ) : (
            comms.map((comm) => (
              <div key={comm.id} className="border border-outline-variant/10 bg-surface-container-low p-3 hover:border-outline-variant/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-on-surface-variant">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(comm.created_at).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-xs text-on-surface line-clamp-2 leading-relaxed">{comm.message}</p>
                <div className="mt-2 flex items-center gap-3 text-[9px] font-mono text-on-surface-variant">
                  <span className="flex items-center gap-1"><Heart className="h-2.5 w-2.5" /> {comm.likes_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-2.5 w-2.5" /> {comm.comments_count}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-outline-variant/10">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-center opacity-60">
          Source ID: {profile.id.slice(0, 16)}...
        </p>
      </div>
    </motion.div>
  );
}
