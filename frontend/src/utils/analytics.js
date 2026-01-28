/**
 * Google Analytics 4 (GA4) tracking utilities
 * 
 * Usage:
 * - trackPageView('screen_name', { optional_params })
 * - trackClick('event_name', { optional_params })
 */

/**
 * Track a page/screen view in Google Analytics 4
 * @param {string} pageName - Name of the page/screen being viewed
 * @param {Object} [params={}] - Additional parameters to send with the event
 * @returns {void}
 */
export function trackPageView(pageName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      ...params
    });
  }
}

/**
 * Track a button click or user action in Google Analytics 4
 * @param {string} eventName - Name of the event (e.g., 'video_download', 'form_submit')
 * @param {Object} [params={}] - Additional parameters to send with the event
 * @returns {void}
 */
export function trackClick(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}
