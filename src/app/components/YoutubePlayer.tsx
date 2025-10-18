"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../utils/aceternity";

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  customThumbnail?: string;

  // Container & Layout
  className?: string;

  // Thumbnail & Media
  thumbnailClassName?: string;
  thumbnailImageClassName?: string;

  // Play Button
  playButtonClassName?: string;
  playIconClassName?: string;

  // Title
  titleClassName?: string;

  // Player
  playerClassName?: string;
}

const YouTubePlayer = ({
  videoId,
  title,
  customThumbnail,

  // Styling props
  className,

  thumbnailClassName,
  thumbnailImageClassName,
  playButtonClassName,
  playIconClassName,
  titleClassName,
  playerClassName,
}: YouTubePlayerProps) => {
  const [playing, setPlaying] = useState(false);

  // Extract video ID from full URL if needed
  const extractVideoId = (id: string) => {
    if (id.includes("youtube.com") || id.includes("youtu.be")) {
      try {
        const url = new URL(id);
        if (id.includes("youtube.com")) {
          return url.searchParams.get("v") || "";
        } else {
          return url.pathname.substring(1);
        }
      } catch (error) {
        console.error("Invalid YouTube URL:", error);
        return id;
      }
    }
    return id;
  };

  const actualVideoId = extractVideoId(videoId);

  const handlePlay = () => {
    setPlaying(true);
  };

  const getThumbnailUrl = () => {
    if (customThumbnail) return customThumbnail;
    return actualVideoId
      ? `https://i.ytimg.com/vi/${actualVideoId}/hqdefault.jpg`
      : "";
  };

  return (
    <>
      {/* Main container - always in the document flow */}
      <div className={cn("relative", className)}>
        <motion.div
          layoutId={`youtube-player-${videoId}`}
          className={cn("overflow-hidden shadow-lg rounded-xl")}
        >
          <motion.div
            layoutId={`youtube-player-content-${videoId}`}
            className={cn("relative aspect-video bg-muted", playerClassName)}
          >
            {!playing && (
              <>
                <motion.div
                  layoutId={`youtube-player-thumbnail-container-${videoId}`}
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br from-muted to-muted/80",
                    thumbnailClassName
                  )}
                >
                  {getThumbnailUrl() && (
                    <motion.img
                      layoutId={`youtube-player-thumbnail-${videoId}`}
                      src={getThumbnailUrl()}
                      alt={title || "Video thumbnail"}
                      className={cn(
                        "absolute inset-0 h-full w-full object-cover",
                        thumbnailImageClassName
                      )}
                    />
                  )}
                </motion.div>
                <div
                  className="absolute inset-0 bg-black/40"
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={handlePlay}
                  aria-label={`Play video${title ? `: ${title}` : ""}`}
                  className="cursor-pointer absolute inset-0 z-10 flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group"
                >
                  <span className="sr-only">{title || "YouTube video"}</span>
                  <span
                    className={cn(
                      "relative h-16 w-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center",
                      playButtonClassName
                    )}
                  >
                    <Play
                      className={cn(
                        "h-6 w-6 translate-x-[2px] text-primary group-hover:scale-120 transition-transform",
                        playIconClassName
                      )}
                    />
                  </span>

                  {title && (
                    <span
                      id={`youtube-player-title-${videoId}`}
                      className={cn(
                        "mt-4 max-w-xs text-center text-sm font-semibold",
                        titleClassName
                      )}
                    >
                      {title}
                    </span>
                  )}
                </button>
              </>
            )}

            {playing && (
              <iframe
                src={`https://www.youtube.com/embed/${actualVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&controls=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            )}
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default YouTubePlayer;
