import { useState, useRef, useCallback } from "react";

/**
 * Phase 4: Redesigned InputScreen
 *
 * Changes from Phase 3:
 * - Auto-detect 1 or 2 photos (no radio buttons)
 * - Multi-file upload support
 * - Swap button for 2-photo mode
 * - Native date picker
 * - Cleaner photo upload UX
 */

// Format date for invite display
function formatDateForInvite(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-IN", options);
}

export default function InputScreen({ onGenerate, error }) {
  // Form fields
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [venue, setVenue] = useState("");

  // Photo state - array of 0-2 photos
  const [photos, setPhotos] = useState([]);
  const [isSwapped, setIsSwapped] = useState(false);

  const fileInputRef = useRef(null);

  // Derived values
  const photoCount = photos.length;
  const isTwoPhotoMode = photoCount === 2;

  // Get photos in correct order (considering swap)
  const getOrderedPhotos = useCallback(() => {
    if (photoCount !== 2) return photos;
    return isSwapped ? [photos[1], photos[0]] : photos;
  }, [photos, isSwapped, photoCount]);

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Take up to 2 photos
    const selectedPhotos = files.slice(0, 2);
    setPhotos(selectedPhotos);
    setIsSwapped(false); // Reset swap when new photos are selected

    // Clear the input so the same files can be selected again
    e.target.value = "";
  };

  // Handle swap button
  const handleSwap = () => {
    setIsSwapped(!isSwapped);
  };

  // Clear photos
  const handleClearPhotos = () => {
    setPhotos([]);
    setIsSwapped(false);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!brideName.trim() || !groomName.trim() || !weddingDate || !venue.trim()) {
      alert("Please fill all fields");
      return;
    }

    if (photos.length === 0) {
      alert("Please upload at least one photo");
      return;
    }

    // Get photos in correct order
    const orderedPhotos = getOrderedPhotos();

    onGenerate({
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      date: formatDateForInvite(weddingDate),
      venue: venue.trim(),
      photo1: orderedPhotos[0],
      photo2: orderedPhotos[1] || null,
    });
  };

  // Render photo preview section
  const renderPhotoSection = () => {
    const orderedPhotos = getOrderedPhotos();

    if (photoCount === 0) {
      return (
        <div className="photo-upload-empty">
          <button
            type="button"
            className="upload-btn upload-btn-large"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="upload-icon">+</span>
            <span className="upload-text">Upload Photo(s)</span>
            <span className="upload-hint">Select 1 couple photo or 2 individual photos</span>
          </button>
        </div>
      );
    }

    if (photoCount === 1) {
      return (
        <div className="photo-single">
          <div className="photo-card">
            <span className="photo-label">Couple Photo</span>
            <div className="photo-preview">
              <img src={URL.createObjectURL(photos[0])} alt="Couple" />
            </div>
          </div>
          <button
            type="button"
            className="change-photos-btn"
            onClick={handleClearPhotos}
          >
            Change Photo
          </button>
        </div>
      );
    }

    // Two photos with swap button
    return (
      <div className="photo-dual">
        <div className="photo-pair">
          <div className="photo-card">
            <span className="photo-label">Groom</span>
            <div className="photo-preview">
              <img src={URL.createObjectURL(orderedPhotos[0])} alt="Groom" />
            </div>
          </div>

          <button
            type="button"
            className="swap-btn"
            onClick={handleSwap}
            aria-label="Swap photos"
          >
            <span className="swap-icon">⇄</span>
          </button>

          <div className="photo-card">
            <span className="photo-label">Bride</span>
            <div className="photo-preview">
              <img src={URL.createObjectURL(orderedPhotos[1])} alt="Bride" />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="change-photos-btn"
          onClick={handleClearPhotos}
        >
          Change Photos
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
            <input
              type="text"
              id="groomName"
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              placeholder="Enter groom's name"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="brideName">Bride Name / दुल्हन का नाम</label>
            <input
              type="text"
              id="brideName"
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              placeholder="Enter bride's name"
              autoComplete="off"
              required
            />
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
          <input
            type="text"
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g., Hotel Rambagh Palace, Jaipur"
            autoComplete="off"
            required
          />
        </div>

        {/* Photo Upload Section */}
        <div className="form-group">
          <label>Photos / तस्वीरें</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {renderPhotoSection()}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="generate-btn"
          disabled={photos.length === 0}
        >
          Generate Invite
        </button>
      </form>
    </div>
  );
}
