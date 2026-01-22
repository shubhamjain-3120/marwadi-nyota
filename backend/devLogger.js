/**
 * Dev Logger Utility for Backend
 * 
 * Logs detailed step-by-step information when DEV_MODE environment variable is set.
 * In development, you can enable by setting DEV_MODE=true
 */

/**
 * Check if dev mode is currently enabled
 */
export function isDevMode() {
  return process.env.DEV_MODE === "true" || process.env.NODE_ENV === "development";
}

/**
 * Log a message only when dev mode is enabled
 * @param {string} component - Component/module name (e.g., "Server", "Gemini")
 * @param {string} step - Step name/description
 * @param {object} data - Optional data to log
 */
export function devLog(component, step, data = null) {
  if (!isDevMode()) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[DEV ${timestamp}] [${component}]`;
  
  if (data !== null && data !== undefined) {
    console.log(`${prefix} ${step}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${step}`);
  }
}

/**
 * Log an error only when dev mode is enabled
 * @param {string} component - Component/module name
 * @param {string} step - Step name/description
 * @param {Error|string} error - Error to log
 */
export function devError(component, step, error) {
  if (!isDevMode()) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[DEV ${timestamp}] [${component}]`;
  
  if (error instanceof Error) {
    console.error(`${prefix} ERROR - ${step}:`, {
      message: error.message,
      stack: error.stack?.slice(0, 500),
    });
  } else {
    console.error(`${prefix} ERROR - ${step}:`, error);
  }
}

/**
 * Log a warning only when dev mode is enabled
 * @param {string} component - Component/module name
 * @param {string} step - Step name/description
 * @param {string} message - Warning message
 */
export function devWarn(component, step, message) {
  if (!isDevMode()) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[DEV ${timestamp}] [${component}]`;
  
  console.warn(`${prefix} WARN - ${step}:`, message);
}

/**
 * Create a scoped logger for a specific component
 * @param {string} component - Component name
 * @returns {object} - Scoped logger with log, error, warn methods
 */
export function createDevLogger(component) {
  return {
    log: (step, data = null) => devLog(component, step, data),
    error: (step, error) => devError(component, step, error),
    warn: (step, message) => devWarn(component, step, message),
    isEnabled: isDevMode,
  };
}

export default {
  log: devLog,
  error: devError,
  warn: devWarn,
  isDevMode,
  createDevLogger,
};
