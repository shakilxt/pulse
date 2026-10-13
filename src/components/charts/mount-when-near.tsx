"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Renders its children once the box comes within half a screen of the
 * viewport. Drawing a chart means measuring the container and every axis
 * label, so charts further down a page wait until the reader nears them
 * instead of all competing with the first paint. The box keeps its fixed
 * height either way, so nothing shifts when a chart appears.
 */
export function MountWhenNear({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full">
      {near ? children : null}
    </div>
  );
}
