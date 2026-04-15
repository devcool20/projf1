"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldAlert, LogOut, Upload, Camera, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { formatTimeAgo } from "@/lib/format";
import { predictionDriverPool } from "@/lib/mock-data";
import { getTeamAccent } from "@/lib/team-colors";
import { applyTeamAccent, resetTeamAccent } from "@/lib/team-accent";

// Team pool for selection
const teamPool = [
  "Red Bull Racing",
  "Mercedes",
  "Ferrari",
  "McLaren",
  "Aston Martin",
  "Alpine",
  "Williams",
  "RB",
  "Kick Sauber",
  "Haas"
];

type Profile = {
  id: string;
  username: string;
  full_name: string;
  fav_team: string | null;
  fav_driver: string | null;
  points: number;
  avatar_url?: string | null;
};

type MinimalUser = {
  id: string;
};

type ProfileComm = {
  id: string;
  message: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

type ProfilePrediction = {
  id: string;
  top3: string[];
  pole_position: string;
  driver_of_the_day: string;
  likes_count: number;
  created_at: string;
  prediction_config?: { event_name?: string };
};

type RawProfilePrediction = Omit<ProfilePrediction, "prediction_config"> & {
  prediction_config?: { event_name?: string } | { event_name?: string }[];
};

function pickPredictionConfig(
  config: { event_name?: string } | { event_name?: string }[] | null | undefined,
) {
  if (!config) return {};
  if (Array.isArray(config)) return config[0] ?? {};
  return config;
}

export function ProfileScreen() {
  const [user, setUser] = useState<MinimalUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comms, setComms] = useState<ProfileComm[]>([]);
  const [predictions, setPredictions] = useState<ProfilePrediction[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const teamAccent = getTeamAccent(profile?.fav_team);

  const fetchProfileData = async (userId: string) => {
    try {
      // Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileData) setProfile(profileData);

      // Fetch Comms
      const { data: commsData } = await supabase
        .from("comms_threads")
        .select(`id, message, likes_count, comments_count, created_at`)
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });
      
      if (commsData) setComms(commsData);

      // Fetch Predictions
      const { data: predsData } = await supabase
        .from("race_predictions")
        .select(`id, top3, pole_position, driver_of_the_day, likes_count, created_at, prediction_config(event_name)`)
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });
      
      if (predsData) {
        const formatted: ProfilePrediction[] = (predsData as RawProfilePrediction[]).map((prediction) => ({
          ...prediction,
          prediction_config: pickPredictionConfig(prediction.prediction_config),
        }));
        setPredictions(formatted);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchProfileData(session.user.id);
      } else {
        setProfile(null);
        setComms([]);
        setPredictions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    applyTeamAccent(profile?.fav_team);
    return () => resetTeamAccent();
  }, [profile?.fav_team]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    if (isSignUp) {
      if (!username || !fullName) {
         setAuthError("Username and Full Name are required for Super License.");
         setLoading(false);
         return;
      }
      console.log("Super License Submission:", { username, fullName, email });
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.startsWith('@') ? username : `@${username}`,
            full_name: fullName
          }
        }
      });
      if (error) {
        console.error("Supabase Auth Error:", error);
        setAuthError(error.message);
      } else if (data.user && data.session === null) {
        setAuthError("Verification link sent! Check your comms link (email) before first flight.");
      } else {
        setAuthError("Signup successful. Access granted.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (field: string, value: string) => {
    if (!profile) return;
    
    // Update local state optimistically
    setProfile(prev => ({ ...prev!, [field]: value }));

    // Send to Supabase
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", profile.id);
      
    if (error) {
      console.error("Error updating profile", error);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!profile || !file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/${Date.now()}-avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const nextUrl = data.publicUrl;
      setProfile((prev) => (prev ? { ...prev, avatar_url: nextUrl } : prev));

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: nextUrl })
        .eq("id", profile.id);
      if (profileError) throw profileError;
    } catch (error) {
      console.error("Avatar upload failed:", error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-on-surface-variant">Syncing Super License...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <div className="dashboard-panel p-6">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-wider text-primary">
            {isSignUp ? "Acquire Super License" : "Verify Super License"}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {isSignUp ? "Register your engineering credentials." : "Authenticate to access Paddock OS capabilities."}
          </p>

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low p-2 text-sm outline-none focus:border-primary"
                    placeholder="E.g., Ayrton Senna"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low p-2 text-sm outline-none focus:border-primary"
                    placeholder="@ayrton"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Comms Link (Email)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low p-2 text-sm outline-none focus:border-primary"
                placeholder="driver@paddock.os"
                required
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Passcode</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low p-2 text-sm outline-none focus:border-primary"
                placeholder="••••••••"
                required
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 border border-alert-red/20 bg-alert-red/10 p-2 text-xs text-alert-red">
                <ShieldAlert className="h-4 w-4" />
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="btn-premium btn-primary mt-4 w-full py-3 font-headline text-sm font-bold tracking-[0.2em] text-white uppercase"
            >
              {isSignUp ? "Register" : "Authenticate"}
            </button>
          </form>

          <div className="mt-6 border-t border-outline-variant/20 pt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-mono text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
            >
              {isSignUp ? "Already hold a license? Authenticate." : "No license? Acquire one."}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="dashboard-panel relative overflow-hidden p-4 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${teamAccent}30 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.03) 100%)`,
        }}
      >
        <div className="absolute right-0 top-0 h-full w-1/3 bg-linear-to-l from-white/15 to-transparent pointer-events-none" />
        
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="z-10 flex min-w-0 flex-1 flex-wrap items-start gap-4 sm:gap-5">
            <div className="card-surface relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-primary/20">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.full_name || "Driver"} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Camera className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: teamAccent }}>Super License</p>
              <h2 className="mt-1 wrap-break-word font-headline text-2xl font-semibold sm:text-4xl">{profile?.full_name || "Driver"}</h2>
              <p className="text-sm font-medium text-on-surface-variant">{profile?.username || "@driver"}</p>
              <motion.label
                whileTap={{ scale: 0.95 }}
                className="card-surface mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-outline-variant/30 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadingAvatar ? "Uploading..." : "Upload photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                />
              </motion.label>
            </div>
          </div>
          <div className="flex w-full flex-row items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:justify-start">
             <motion.button
               whileTap={{ scale: 0.95 }}
               onClick={handleLogout}
               className="group card-surface flex items-center gap-1.5 rounded-full border border-alert-red/30 bg-alert-red/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-alert-red hover:bg-alert-red hover:text-white transition-all"
             >
               <LogOut className="h-3 w-3" /> Terminate Link
             </motion.button>
             <span className="px-3 py-1 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ border: `1px solid ${teamAccent}88`, background: `${teamAccent}22`, color: teamAccent }}>
                Verified
             </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="pl-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-semibold">Constructor Affiliation</label>
            <div className="relative">
              <select
                value={profile?.fav_team || ""}
                onChange={(e) => updateProfile("fav_team", e.target.value)}
                className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="">Select Team</option>
                {teamPool.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className="h-4 w-4 text-on-surface-variant" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="pl-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-semibold">Driver Affiliation</label>
            <div className="relative">
              <select
                value={profile?.fav_driver || ""}
                onChange={(e) => updateProfile("fav_driver", e.target.value)}
                className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="">Select Driver</option>
                {predictionDriverPool.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className="h-4 w-4 text-on-surface-variant" />
              </div>
            </div>
          </div>
          <div className="card-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-semibold">Career Points</p>
            <p className="mt-1 font-headline text-2xl font-bold text-primary">{profile?.points || 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-semibold">License Level</p>
            <p className="mt-1 font-headline text-2xl font-bold text-secondary">A-Class</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* COMMS LOG */}
        <section className="dashboard-panel p-5">
          <div className="flex items-center justify-between border-b border-primary/20 pb-3">
            <h3 className="font-headline text-xl">Transmitted Comms</h3>
            <span className="font-mono text-[10px] tracking-[0.2em] text-on-surface-variant">{comms.length} TOTAL</span>
          </div>
          <div className="mt-4 flex flex-col gap-3 max-h-[460px] overflow-y-auto premium-scrollbar pr-2 pb-4">
            {comms.length === 0 ? (
              <p className="font-mono text-xs text-on-surface-variant py-4">No comms transmitted.</p>
            ) : (
              comms.map((comm) => (
                <div key={comm.id} className="card-surface cursor-default p-4 transition-all hover:border-primary/35">
                  <p className="font-mono text-[10px] text-primary/80 font-bold uppercase tracking-wider">{formatTimeAgo(comm.created_at)}</p>
                  <p className="mt-2 text-[15px] sm:text-base text-on-surface leading-normal line-clamp-3">{comm.message}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-on-surface-variant/80 uppercase tracking-wide">
                    <span>{comm.likes_count} Likes</span>
                    <span>{comm.comments_count} Replies</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PREDICTIONS LOG */}
        <section className="dashboard-panel p-5">
          <div className="flex items-center justify-between border-b border-secondary/20 pb-3">
            <h3 className="font-headline text-xl">Deployed Predictions</h3>
            <span className="font-mono text-[10px] tracking-[0.2em] text-on-surface-variant">{predictions.length} TOTAL</span>
          </div>
          <div className="mt-4 flex flex-col gap-4 max-h-[460px] overflow-y-auto premium-scrollbar pr-2 pb-4">
            {predictions.length === 0 ? (
              <p className="font-mono text-xs text-on-surface-variant py-4">No predictions deployed.</p>
            ) : (
              predictions.map((pred) => (
                <div key={pred.id} className="card-surface cursor-default p-4 transition-all hover:border-secondary/35">
                  <div className="flex items-start justify-between">
                    <p className="font-mono text-[11px] font-bold text-secondary uppercase tracking-[0.2em]">{pred.prediction_config?.event_name || "Grand Prix"}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider">{formatTimeAgo(pred.created_at)}</p>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {pred.top3.map((driver: string, idx: number) => (
                      <div key={idx} className="card-surface rounded-lg p-2.5 text-center">
                        <span className="block font-mono text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">P{idx+1}</span>
                        <span className="mt-1 block font-headline text-xs font-semibold text-on-surface truncate">{driver.split(' ').pop()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-between border-t border-outline-variant/10 pt-3 font-mono text-[10px] tracking-wide text-on-surface-variant">
                    <span>POLE: <span className="font-headline font-bold text-on-surface">{pred.pole_position.split(' ').pop()}</span></span>
                    <span>DOTD: <span className="font-headline font-bold text-on-surface">{pred.driver_of_the_day.split(' ').pop()}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
