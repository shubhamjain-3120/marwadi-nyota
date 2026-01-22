import { useState, useRef, useEffect, useMemo } from "react";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { createDevLogger } from "../utils/devLogger";

const logger = createDevLogger("InputScreen");

/**
 * Phase 6: Single Photo Mode
 *
 * Changes from Phase 5:
 * - Only require 1 photo (couple photo with both groom and bride)
 * - Native date picker
 * - Cleaner photo upload UX
 * - Proper cleanup of Object URLs to prevent memory leaks
 */

// LocalStorage key for caching form data
const CACHE_KEY = "wedding-invite-form-cache";
const DEV_MODE_KEY = "wedding-invite-dev-mode";

// Format date for invite display
function formatDateForInvite(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-IN", options);
}

// Load cached form data from localStorage
function loadCachedFormData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Failed to load cached form data:", e);
  }
  return null;
}

// Save form data to localStorage
function saveCachedFormData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save form data to cache:", e);
  }
}

export default function InputScreen({ onGenerate, error }) {
  // Load cached data on initial render
  const cachedData = useMemo(() => loadCachedFormData(), []);

  // Form fields - initialize from cache if available
  const [brideName, setBrideName] = useState(cachedData?.brideName || "");
  const [groomName, setGroomName] = useState(cachedData?.groomName || "");
  const [weddingDate, setWeddingDate] = useState(cachedData?.weddingDate || "");
  const [venue, setVenue] = useState(cachedData?.venue || "");

  // Save form data to cache whenever it changes
  useEffect(() => {
    saveCachedFormData({ brideName, groomName, weddingDate, venue });
  }, [brideName, groomName, weddingDate, venue]);

  // Photo state - single photo (couple photo)
  const [photo, setPhoto] = useState(null);

  // Dev mode toggle - use local character file instead of API
  const [devMode, setDevMode] = useState(() => {
    try {
      return localStorage.getItem(DEV_MODE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [characterFile, setCharacterFile] = useState(null);
  const characterFileInputRef = useRef(null);

  // Persist dev mode preference
  useEffect(() => {
    try {
      localStorage.setItem(DEV_MODE_KEY, devMode ? "true" : "false");
    } catch {
      // ignore
    }
  }, [devMode]);

  const fileInputRef = useRef(null);

  // Voice input
  const { isListening, activeField, startListening, stopListening, isSupported } =
    useSpeechRecognition();

  // Handle voice input for a field
  const handleVoiceInput = (fieldId, setter) => {
    if (isListening && activeField === fieldId) {
      stopListening();
    } else {
      startListening(fieldId, setter);
    }
  };

  // Derived values
  const hasPhoto = photo !== null;

  // Create and manage Object URL for photo preview
  // This prevents memory leaks by cleaning up old URL when photo changes
  const photoUrl = useMemo(() => {
    return photo ? URL.createObjectURL(photo) : null;
  }, [photo]);

  // Cleanup Object URL when photo changes or component unmounts
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Take only the first photo
    setPhoto(files[0]);

    // Clear the input so the same file can be selected again
    e.target.value = "";
  };

  // Clear photo
  const handleClearPhoto = () => {
    setPhoto(null);
  };

  // Handle character file selection for dev mode
  const handleCharacterFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setCharacterFile(files[0]);
    e.target.value = "";
  };

  // Create Object URL for character file preview
  const characterFileUrl = useMemo(() => {
    return characterFile ? URL.createObjectURL(characterFile) : null;
  }, [characterFile]);

  // Cleanup character file URL
  useEffect(() => {
    return () => {
      if (characterFileUrl) URL.revokeObjectURL(characterFileUrl);
    };
  }, [characterFileUrl]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    logger.log("Form submission started", {
      devMode,
      hasPhoto: !!photo,
      hasCharacterFile: !!characterFile,
    });

    if (!brideName.trim() || !groomName.trim() || !weddingDate || !venue.trim()) {
      logger.warn("Form validation", "Missing required fields");
      alert("Please fill all fields");
      return;
    }

    if (devMode) {
      // In dev mode, only character file is required (not the photo)
      if (!characterFile) {
        logger.warn("Form validation", "Dev mode requires character file");
        alert("Dev mode is enabled - please upload a character file");
        return;
      }
    } else {
      // In normal mode, photo is required
      if (!photo) {
        logger.warn("Form validation", "Normal mode requires photo");
        alert("Please upload a couple photo");
        return;
      }
    }

    const formData = {
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      date: formatDateForInvite(weddingDate),
      venue: venue.trim(),
      photo, // Single couple photo
      devMode, // Whether to skip API
      characterFile: devMode ? characterFile : null, // Character file for dev mode
    };

    logger.log("Form validation passed, calling onGenerate", {
      brideName: formData.brideName,
      groomName: formData.groomName,
      date: formData.date,
      venue: formData.venue,
      devMode: formData.devMode,
      photoSize: photo ? `${(photo.size / 1024).toFixed(1)} KB` : null,
      characterFileSize: characterFile ? `${(characterFile.size / 1024).toFixed(1)} KB` : null,
    });

    onGenerate(formData);
  };

  // Render photo preview section
  const renderPhotoSection = () => {
    if (!hasPhoto) {
      return (
        <div className="photo-upload-empty">
          <button
            type="button"
            className="upload-btn upload-btn-large"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="upload-icon">+</span>
            <span className="upload-text">Upload Photo</span>
            <span className="upload-hint">Select a couple photo with both groom and bride</span>
          </button>
        </div>
      );
    }

    // Single photo - display with change option
    return (
      <div className="photo-single">
        <div className="photo-card photo-card-large">
          <div className="photo-preview">
            <img src={photoUrl} alt="Couple photo" />
          </div>
        </div>

        <button
          type="button"
          className="change-photos-btn"
          onClick={handleClearPhoto}
        >
          Change Photo
        </button>
      </div>
    );
  };

  return (
    <div className="input-screen">
      <header className="header">
        <h1>Wedding Invite</h1>
        <p>Create your Marwadi wedding invitation</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        {/* Names Section */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="groomName">Groom Name / दूल्हे का नाम</label>
            <div className="input-with-voice">
              <input
                type="text"
                id="groomName"
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                placeholder="Enter groom's name"
                autoComplete="off"
                required
              />
              {isSupported && (
                <button
                  type="button"
                  className={`voice-btn ${isListening && activeField === "groomName" ? "listening" : ""}`}
                  onClick={() => handleVoiceInput("groomName", setGroomName)}
                  aria-label="Voice input for groom name"
                >
                  <svg className="voice-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="brideName">Bride Name / दुल्हन का नाम</label>
            <div className="input-with-voice">
              <input
                type="text"
                id="brideName"
                value={brideName}
                onChange={(e) => setBrideName(e.target.value)}
                placeholder="Enter bride's name"
                autoComplete="off"
                required
              />
              {isSupported && (
                <button
                  type="button"
                  className={`voice-btn ${isListening && activeField === "brideName" ? "listening" : ""}`}
                  onClick={() => handleVoiceInput("brideName", setBrideName)}
                  aria-label="Voice input for bride name"
                >
                  <svg className="voice-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Date Section */}
        <div className="form-group">
          <label htmlFor="weddingDate">Wedding Date / शादी की तारीख</label>
          <input
            type="date"
            id="weddingDate"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
            required
          />
          {weddingDate && (
            <span className="date-preview">
              {formatDateForInvite(weddingDate)}
            </span>
          )}
        </div>

        {/* Venue Section */}
        <div className="form-group">
          <label htmlFor="venue">Venue & City / स्थान</label>
          <div className="input-with-voice">
            <input
              type="text"
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Hotel Rambagh Palace, Jaipur"
              autoComplete="off"
              required
            />
            {isSupported && (
              <button
                type="button"
                className={`voice-btn ${isListening && activeField === "venue" ? "listening" : ""}`}
                onClick={() => handleVoiceInput("venue", setVenue)}
                aria-label="Voice input for venue"
              >
                <svg className="voice-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dev Mode Toggle */}
        <div className="form-group">
          <div className="toggle-row">
            <label htmlFor="devMode" className="toggle-label">
              Dev Mode (Use Local Character File)
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={devMode}
              className={`toggle-switch ${devMode ? "toggle-on" : ""}`}
              onClick={() => setDevMode(!devMode)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          {devMode && (
            <div className="dev-mode-section">
              <input
                type="file"
                ref={characterFileInputRef}
                accept="image/*"
                onChange={handleCharacterFileChange}
                style={{ display: "none" }}
              />
              {!characterFile ? (
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => characterFileInputRef.current?.click()}
                >
                  <span className="upload-text">Upload Character File</span>
                  <span className="upload-hint">PNG with transparent background recommended</span>
                </button>
              ) : (
                <div className="character-file-preview">
                  <img src={characterFileUrl} alt="Character preview" />
                  <button
                    type="button"
                    className="change-photos-btn"
                    onClick={() => setCharacterFile(null)}
                  >
                    Change Character File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Upload Section */}
        <div className="form-group">
          <label>Photo / तस्वीर</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {renderPhotoSection()}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="generate-btn"
          disabled={devMode ? !characterFile : !hasPhoto}
        >
          Generate Invite (निमंत्रण बनाएं)
        </button>
      </form>
    </div>
  );
}
