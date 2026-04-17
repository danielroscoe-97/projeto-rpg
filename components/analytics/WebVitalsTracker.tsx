"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

export function WebVitalsTracker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const report = (metric: Metric) => {
      track(metric.name, {
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    };

    onLCP(report);
    onCLS(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  }, []);

  return null;
}
