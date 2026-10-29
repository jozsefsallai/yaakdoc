"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export function ShowcaseVideo({
  src,
  width,
  height,
  label,
}: {
  src: string;
  width: number;
  height: number;
  label: string;
}) {
  return (
    <>
      <Clip
        src={`${src}-light`}
        width={width}
        height={height}
        label={label}
        className="dark:hidden"
      />

      <Clip
        src={`${src}-dark`}
        width={width}
        height={height}
        label={label}
        className="hidden dark:block"
      />
    </>
  );
}

function Clip({
  src,
  width,
  height,
  label,
  className,
}: {
  src: string;
  width: number;
  height: number;
  label: string;
  className: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={cn("block h-auto w-full", className)}
      width={width}
      height={height}
      poster={`${src}.webp`}
      aria-label={label}
      preload="none"
      muted
      loop
      playsInline
    >
      <source src={`${src}.mp4`} type="video/mp4" />
    </video>
  );
}
