import { useEffect } from "react";
import { trackPageView, trackClick } from "../utils/analytics";

/**
 * Sample Video Screen - Hero example of final output
 * 
 * Shows a sample wedding invite video to entice users
 * and drives them to upload their photo
 */

export default function SampleVideoScreen({ onProceed }) {
  // Track page view on mount
  useEffect(() => {
    trackPageView('sample_video');
  }, []);

  const handleProceed = () => {
    trackClick('sample_video_proceed');
    onProceed();
  };

  return (
    <div className="input-screen">
      <div className="form">
        {/* Hero headline */}
        <div style={{
          backgroundColor: '#fffacd',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <div className="sample-video-value-hindi">
            <label>एक फोटो अपलोड करें. मिनटों में पाएँ WhatsApp-ready वीडियो निमंत्रण.</label>
            <p className="form-hint">Upload one photo. Get a WhatsApp-ready video invite in minutes.</p>
          </div>
        </div>

        {/* Hero section with video */}
        <div className="form-group">
          <video
            className="sample-video-player"
            src="/assets/sample.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
          />
        </div>

        {/* CTA Button */}
        <button
          className="generate-btn"
          onClick={handleProceed}
        >
          फोटो अपलोड करें (Upload Photo)
        </button>
      </div>
    </div>
  );
}