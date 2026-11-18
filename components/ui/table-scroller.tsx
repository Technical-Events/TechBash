"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * The scrolling box around a Table. When the table is wider than the
 * screen (phones), a line below says so, because a scrollable area
 * looks like any other box on touch screens.
 */
export function TableScroller({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setOverflowing(box.scrollWidth > box.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      <div
        ref={ref}
        className="overflow-x-auto border border-line"
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        {children}
      </div>
      {overflowing && (
        <p className="mt-2 text-xs text-muted">
          # Scroll the table sideways for more columns -&gt;
        </p>
      )}
    </div>
  );
}
