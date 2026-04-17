"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

type PullToRefreshOptions = {
  disabled?: boolean;
  getScrollTop?: () => number;
  maxPull?: number;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
};

type GestureState = {
  armed: boolean;
  pulling: boolean;
  startY: number;
};

function dampen(distance: number, maxPull: number) {
  return Math.min(maxPull, distance * 0.45);
}

export function usePullToRefresh({
  disabled = false,
  getScrollTop,
  maxPull = 132,
  onRefresh,
  threshold = 96,
}: PullToRefreshOptions) {
  const runRefresh = useEffectEvent(onRefresh);
  const readScrollTop = useEffectEvent(() => getScrollTop?.() ?? window.scrollY);
  const gestureRef = useRef<GestureState>({ armed: false, pulling: false, startY: 0 });
  const [pullDistance, setPullDistance] = useState(0);
  const [isArmed, setIsArmed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const reset = () => {
      gestureRef.current = { armed: false, pulling: false, startY: 0 };
      setIsArmed(false);
      setPullDistance(0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (readScrollTop() > 0 || isRefreshing || event.touches.length !== 1) return;
      gestureRef.current = {
        armed: false,
        pulling: true,
        startY: event.touches[0]?.clientY ?? 0,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!gestureRef.current.pulling || event.touches.length !== 1) return;
      if (readScrollTop() > 0) {
        reset();
        return;
      }

      const currentY = event.touches[0]?.clientY ?? 0;
      const rawDistance = currentY - gestureRef.current.startY;

      if (rawDistance <= 0) {
        setIsArmed(false);
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      const armed = rawDistance >= threshold;
      gestureRef.current.armed = armed;
      setIsArmed(armed);
      setPullDistance(dampen(rawDistance, maxPull));
    };

    const finishGesture = async () => {
      if (!gestureRef.current.pulling) return;
      const shouldRefresh = gestureRef.current.armed;
      gestureRef.current = { armed: false, pulling: false, startY: 0 };
      setIsArmed(false);

      if (!shouldRefresh) {
        setPullDistance(0);
        return;
      }

      setPullDistance(Math.min(maxPull, threshold * 0.55));
      setIsRefreshing(true);
      try {
        await runRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", finishGesture);
    window.addEventListener("touchcancel", finishGesture);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", finishGesture);
      window.removeEventListener("touchcancel", finishGesture);
    };
  }, [disabled, isRefreshing, maxPull, threshold]);

  return { isArmed, isRefreshing, pullDistance };
}
