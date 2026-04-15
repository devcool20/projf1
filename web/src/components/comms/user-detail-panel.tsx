"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Trophy, Signal, Clock, Heart, MessageCircle, X, Shield, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DriverVideo } from "@/components/ui/driver-video";
import { applyTeamAccent, getTeamColor } from "@/lib/team-accent";
import { User } from "lucide-react";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  fav_team: string | null;
  fav_driver: string | null;
  avatar_url?: string | null;
  points: number;
};

type ProfileComm = {
  id: string;
  message: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  image_url: string | null;
};

type Props = {
  profileId: string;
  onBack: () => void;
  onTeamAccent?: (teamName: string | null) => void;
};

export function UserDetailPanel({ profileId, onBack, onTeamAccent }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comms, setComms] = useState<ProfileComm[]>([]);
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

  useEffect(() => {
    if (!profile) return;
    applyTeamAccent(profile.fav_team);
    onTeamAccent?.(profile.fav_team);
  }, [profile, onTeamAccent]);

  if (loading) {
    return (
      <div className="comms-light-theme flex h-80 flex-col items-center justify-center dashboard-panel rounded-pill border border-outline-variant/20 bg-surface/80 backdrop-blur-xl">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Syncing Racing Identity...</p>
      </div>
    );
  }

  if (!profile) return null;

  const teamColor = getTeamColor(profile.fav_team || "");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      className="comms-light-theme relative overflow-hidden rounded-pill bg-surface/95 backdrop-blur-2xl border border-outline-variant/30 shadow-[0_32px_80px_rgba(0,0,0,0.4)] max-h-[90dvh] flex flex-col premium-scrollbar"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dynamic Background Element */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div 
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[100px]" 
          style={{ backgroundColor: teamColor }} 
        />
        <div 
          className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full blur-[100px]" 
          style={{ backgroundColor: teamColor }} 
        />
      </div>

      {/* Floating Close Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.1 }}
        onClick={onBack}
        className="absolute right-6 top-6 z-60 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest/60 backdrop-blur-md border border-outline-variant/30 text-on-surface transition-all shadow-xl"
      >
        <X className="h-5 w-5" />
      </motion.button>

      <div className="flex-1 overflow-y-auto premium-scrollbar p-6 sm:p-8">
        <header className="relative mb-8">
          <div className="flex items-center gap-6">
            <div 
              className="relative h-28 w-28 shrink-0 rounded-4xl overflow-hidden border-2 flex items-center justify-center bg-surface-container-high transition-all shadow-inner group"
              style={{ borderColor: teamColor || "rgb(var(--primary))" }}
            >
              <AnimatePresence mode="wait">
                {profile.avatar_url ? (
                  <motion.img 
                    key="avatar"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={profile.avatar_url} 
                    alt={profile.full_name} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <motion.div 
                    key="placeholder"
                    className="flex h-full w-full items-center justify-center bg-linear-to-br from-surface-container-high to-surface-container-highest"
                  >
                    <User className="h-10 w-10 text-on-surface/20" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{ backgroundColor: teamColor }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Super License</span>
                <div className="h-1 w-1 rounded-full bg-outline-variant/30" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">Rank A-Tier</span>
              </div>
              <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface mb-1">
                {profile.full_name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-primary font-bold tracking-wider">
                  {profile.username?.startsWith("@") ? profile.username : `@${profile.username}`}
                </p>
                <div className="h-4 w-px bg-outline-variant/20" />
                <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-widest">{profile.points} PTS</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <motion.div 
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant/20 p-5 transition-all hover:bg-surface-container-high"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">Affiliation</span>
              </div>
              <div className="h-1 w-12 rounded-full overflow-hidden bg-outline-variant/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  className="h-full" 
                  style={{ backgroundColor: teamColor }} 
                />
              </div>
            </div>
            <p className="font-headline text-2xl font-black text-on-surface tracking-tight uppercase italic">{profile.fav_team || "Privateer"}</p>
            <div className="mt-4 flex items-center justify-between">
              <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Priority Status</p>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-outline-variant/20 font-mono text-[10px] text-on-surface font-black">ACTIVE</span>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant/20 p-5 transition-all hover:bg-surface-container-high"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-secondary/10">
                  <Star className="h-4 w-4 text-secondary" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">Preferred Driver</span>
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(var(--secondary),0.5)]" />
            </div>
            <p className="font-headline text-2xl font-black text-on-surface tracking-tight uppercase italic">{profile.fav_driver || "None"}</p>
            <div className="mt-4 flex items-center justify-between">
              <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Driver Tier</p>
              <span className="px-2 py-0.5 rounded-md bg-secondary/10 border border-secondary/20 font-mono text-[10px] text-secondary font-black">ELITE</span>
            </div>
          </motion.div>
        </div>

        {/* Career Stats Card */}
        <div className="rounded-2xl bg-slate-900 p-6 mb-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 h-full w-48 opacity-10 pointer-events-none">
            <Trophy className="h-full w-full rotate-12 scale-110" />
          </div>
          <div className="relative z-10 flex border-b border-white/10 pb-4 mb-4 items-end justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/60">Career Progression</p>
              <h3 className="font-headline text-xl mt-1">Ranking Statistics</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <Signal className="h-3 w-3 text-secondary" />
              <span className="font-mono text-[9px] uppercase tracking-widest">Active Link</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 relative z-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">Total Points</p>
              <p className="font-headline text-2xl font-bold">{profile.points}</p>
            </div>
             <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">Rank</p>
              <p className="font-headline text-2xl font-bold">#42</p>
            </div>
             <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">XP</p>
              <p className="font-headline text-2xl font-bold">8.4K</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 mb-4">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary font-bold">Recent Intelligence Feed</h4>
            <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest">{comms.length} entries</span>
          </div>
          
          {comms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
              <Clock className="h-8 w-8 text-on-surface-variant/20 mb-3" />
              <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest">No transmissions recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comms.map((comm) => (
                <motion.div 
                  key={comm.id} 
                  whileHover={{ x: 4 }}
                  className="group flex flex-col border border-outline-variant/10 bg-surface/50 backdrop-blur-sm p-4 rounded-xl hover:bg-surface-container-low hover:border-outline-variant/30 transition-all cursor-default"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant font-medium">
                      <Clock className="h-3 w-3" />
                      {new Date(comm.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed font-medium">{comm.message}</p>
                  <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-on-surface-variant">
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container/50 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <Heart className="h-3 w-3" /> {comm.likes_count}
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container/50 group-hover:bg-secondary/5 group-hover:text-secondary transition-colors">
                      <MessageCircle className="h-3 w-3" /> {comm.comments_count}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-auto p-6 bg-surface-container-low/50 border-t border-outline-variant/10">
        <div className="flex items-center justify-between opacity-60">
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-on-surface-variant">
            Paddock OS Certified Profile
          </p>
          <p className="font-mono text-[9px] font-bold text-on-surface-variant">
            ID: {profile.id.slice(0, 8)}
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
