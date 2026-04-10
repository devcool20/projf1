"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  profile: {
    id: string;
    username: string;
  };
  onSuccess: () => void;
};

export function CreateThreadPanel({ profile, onSuccess }: Props) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name}`;
    try {
      const { data, error } = await supabase.storage
        .from("comm_images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("comm_images")
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error("Critical Upload Failure:", err);
      // Removed blob fallback to prevent ERR_FILE_NOT_FOUND in main feed
      return null; 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    let imageUrl = null;

    if (fileInputRef.current?.files?.[0]) {
      imageUrl = await uploadImage(fileInputRef.current.files[0]);
    }

    const { error } = await supabase.from("comms_threads").insert({
      profile_id: profile.id,
      message: message.trim(),
      image_url: imageUrl,
      likes_count: 0,
      comments_count: 0,
    });

    if (error) {
      console.error("Error creating thread:", error);
    } else {
      setMessage("");
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="dashboard-panel p-5"
    >
      <div className="flex items-center gap-3 border-b border-primary/20 pb-4 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-secondary/40 bg-secondary/10">
          <span className="font-headline text-lg text-secondary">
            {profile?.username?.[0]?.toUpperCase() || "P"}
          </span>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">New Transmission</p>
          <p className="font-headline text-lg leading-none mt-1">{profile?.username}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none border border-outline-variant/35 bg-surface-container-low p-4 font-mono text-sm tracking-[0.05em] text-on-surface outline-none focus:border-primary transition-colors min-h-[160px]"
            placeholder="BROADCAST TO THE GRID..."
            disabled={isSubmitting}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className={`font-mono text-[10px] ${message.length > 240 ? "text-alert-red" : "text-on-surface-variant"}`}>
              {message.length}/280
            </span>
          </div>
        </div>

        <AnimatePresence>
          {previewUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative h-48 w-full overflow-hidden rounded-sm border border-outline-variant/40"
            >
              <Image src={previewUrl} alt="Preview" fill className="object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-outline-variant/30 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant hover:border-secondary/40 hover:text-secondary transition-all"
            disabled={isSubmitting}
          >
            <ImagePlus className="h-4 w-4" />
            Attach Intel
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className="group flex items-center gap-2 bg-primary px-6 py-2.5 font-headline text-sm font-bold tracking-[0.2em] text-white uppercase hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
            Transmit
          </button>
        </div>
      </form>

      <div className="mt-6 border-t border-outline-variant/10 pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant leading-relaxed">
          Communications are monitored by Paddock Control. 
          Use clear and concise radio protocol.
        </p>
      </div>
    </motion.div>
  );
}
