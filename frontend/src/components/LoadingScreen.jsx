import { useState, useEffect, useRef } from "react";
import { trackPageView } from "../utils/analytics";

/**
 * Loading Screen with New Progress Bar Logic
 *
 * Progress stages:
 * - 0-90%: Increase 1% every n seconds where n is random between 1-3 seconds
 * - 90-98%: Increase 1% every 5 seconds
 * - 98-100%: Wait for actual process completion, then jump to 100% immediately
 */

export default function LoadingScreen({ completed = false, onCancel }) {
  const [progress, setProgress] = useState(0);
  const progressTimeoutRef = useRef(null);

  // Track page view on mount
  useEffect(() => {
    trackPageView('loading');
  }, []);

  // Jump to 100% when completed prop becomes true
  useEffect(() => {
    if (completed && progress < 100) {
      // Clear any pending timeouts
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
        progressTimeoutRef.current = null;
      }
      setProgress(100);
    }
  }, [completed, progress]);

  // Progress increment logic
  useEffect(() => {
    // Don't start if already completed or at 100%
    if (completed || progress >= 100) return;

    // Don't progress past 98% automatically - wait for completion signal
    if (progress >= 98) return;

    // Calculate delay based on current progress
    let delay;
    if (progress < 90) {
      // 0-90%: Random delay between 1-3 seconds
      delay = 1000 + Math.random() * 2000; // 1000ms to 3000ms
    } else {
      // 90-98%: Fixed 5 second delay
      delay = 5000;
    }

    // Schedule next progress increment
    progressTimeoutRef.current = setTimeout(() => {
      setProgress((prev) => {
        // Don't exceed 98% automatically
        if (prev >= 98) return prev;
        return prev + 1;
      });
    }, delay);

    // Cleanup timeout on unmount or when progress changes
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
        progressTimeoutRef.current = null;
      }
    };
  }, [progress, completed]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Hindi text - unchanged */}
        <h2 className="loading-text">
          बस 2 मिनट सा आपरो निमंत्रण बन रह्यो है 😊
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

        {/* Cancel button */}
        {onCancel && (
          <button
            className="cancel-btn"
            onClick={onCancel}
            type="button"
          >
            Cancel (रद्द करें)
          </button>
        )}
      </div>
    </div>
  );
}
