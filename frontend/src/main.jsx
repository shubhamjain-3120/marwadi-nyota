import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import mixpanel from "mixpanel-browser";

// Get or create anonymous user ID
function getOrCreateUserId() {
  const STORAGE_KEY = 'wedding_invite_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    // Generate random UUID-like ID
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_KEY, userId);
  }

  return userId;
}

// Initialize Mixpanel
mixpanel.init("0055aa3bfdfecd2baa52f21ddd74a998", {
  debug: true,
  track_pageview: true,
  persistence: "localStorage",
  autocapture: true,
  record_sessions_percent: 100,
  ignore_dnt: true,
});

// Identify user with persistent anonymous ID
const userId = getOrCreateUserId();
mixpanel.identify(userId);
mixpanel.people.set({
  '$name': 'Anonymous User',
  'first_seen': new Date().toISOString(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
