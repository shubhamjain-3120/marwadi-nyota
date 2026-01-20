import { useState, useEffect } from "react";

/**
 * Phase 4: Updated Loading Screen
 *
 * Changes from Phase 3:
 * - Mascot size increased 1.6× (200px → 320px)
 * - Progress duration 1.2× slower (60s → 72s)
 * - Update interval changed to 750ms (was 500ms)
 * - Mascot is now the primary visual element
 */

// Easing function for smooth progress
function easeOutQuad(t) {
  return t * (2 - t);
}

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    // Phase 4: 20% slower duration
    // Phase 3 was 60,000ms, Phase 4 is 72,000ms (60 × 1.2)
    const duration = 72000;
    const targetProgress = 90;

    // Phase 4: Update interval 750ms (average of 700-800ms spec)
    const updateInterval = 750;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuad(t) * targetProgress;

      setProgress(Math.min(easedProgress, targetProgress));

      if (t >= 1) {
        clearInterval(interval);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Hindi text - unchanged */}
        <h2 className="loading-text">
          बस 2 पल रो इंतज़ार सा…
          <br />
          मज़ा अभी बाकी है!
        </h2>

        {/* Mascot - now primary visual, 1.6× larger */}
        <div className="mascot-container mascot-container-large">
          <img
            src="/assets/mascot.png"
            alt="Loading mascot"
            className="mascot mascot-large"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>

        <p className="loading-subtext">
          Creating your beautiful wedding invite...
        </p>
      </div>
    </div>
  );
}
