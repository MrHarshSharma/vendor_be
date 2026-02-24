/**
 * Input Sanitization Utilities
 *
 * These utilities help prevent XSS attacks and injection vulnerabilities
 * by sanitizing user input before storing or displaying it.
 */

/**
 * HTML entities that need to be escaped to prevent XSS
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char]);
};

/**
 * Removes HTML tags from a string
 * @param {string} str - The string to strip
 * @returns {string} - The stripped string
 */
export const stripHtmlTags = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');
  // Strip HTML tags
  sanitized = stripHtmlTags(sanitized);
  // Escape remaining HTML entities
  sanitized = escapeHtml(sanitized);
  // Trim whitespace
  sanitized = sanitized.trim();
  return sanitized;
};

/**
 * Sanitizes an email address
 * @param {string} email - The email to sanitize
 * @returns {string} - The sanitized email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return '';
  }
  // Remove any characters that aren't valid in emails
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._%+-@]/gi, '');
};

/**
 * Sanitizes a phone number (keeps only digits and + for country code)
 * @param {string} phone - The phone number to sanitize
 * @returns {string} - The sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') {
    return '';
  }
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Sanitizes a URL
 * @param {string} url - The URL to sanitize
 * @returns {string} - The sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Only allow http, https, and relative URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    !trimmed.includes(':')
  ) {
    return trimmed;
  }

  return '';
};

/**
 * Sanitizes a number input
 * @param {string|number} value - The value to sanitize
 * @param {object} options - Options for sanitization
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {number} options.defaultValue - Default value if invalid
 * @returns {number} - The sanitized number
 */
export const sanitizeNumber = (value, options = {}) => {
  const { min = -Infinity, max = Infinity, defaultValue = 0 } = options;

  const num = parseFloat(value);

  if (isNaN(num)) {
    return defaultValue;
  }

  return Math.min(Math.max(num, min), max);
};

/**
 * Sanitizes an integer input
 * @param {string|number} value - The value to sanitize
 * @param {object} options - Options for sanitization
 * @returns {number} - The sanitized integer
 */
export const sanitizeInteger = (value, options = {}) => {
  return Math.floor(sanitizeNumber(value, options));
};

/**
 * Sanitizes price/currency values
 * @param {string|number} value - The price value
 * @returns {number} - The sanitized price (2 decimal places, min 0)
 */
export const sanitizePrice = (value) => {
  const num = sanitizeNumber(value, { min: 0, defaultValue: 0 });
  return Math.round(num * 100) / 100;
};

/**
 * Sanitizes an object by sanitizing all string values recursively
 * @param {object} obj - The object to sanitize
 * @param {object} options - Options for specific fields
 * @returns {object} - The sanitized object
 */
export const sanitizeObject = (obj, options = {}) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (options[key]) {
        // Use specific sanitizer for this field
        sanitized[key] = options[key](value);
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value, options);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Validates and sanitizes form data for menu items
 * @param {object} item - The menu item data
 * @returns {object} - The sanitized menu item
 */
export const sanitizeMenuItem = (item) => {
  return {
    name: sanitizeString(item.name || ''),
    description: sanitizeString(item.description || ''),
    price: sanitizePrice(item.price),
    veg_nonveg: ['Veg', 'Non-Veg'].includes(item.veg_nonveg)
      ? item.veg_nonveg
      : 'Veg',
    available: Boolean(item.available),
    imageUrl: sanitizeUrl(item.imageUrl || ''),
  };
};

/**
 * Validates and sanitizes form data for store configuration
 * @param {object} config - The store configuration data
 * @returns {object} - The sanitized configuration
 */
export const sanitizeStoreConfig = (config) => {
  return {
    restaurantName: sanitizeString(config.restaurantName || ''),
    restaurantType: ['cafe', 'restaurant', 'hotel'].includes(config.restaurantType)
      ? config.restaurantType
      : 'restaurant',
    tagline: sanitizeString(config.tagline || ''),
    subtagline: sanitizeString(config.subtagline || ''),
    tables: sanitizeInteger(config.tables, { min: 0, max: 1000 }),
    primaryColor: sanitizeHexColor(config.primaryColor),
    secondaryColor: sanitizeHexColor(config.secondaryColor),
    logo: sanitizeUrl(config.logo || ''),
  };
};

/**
 * Sanitizes a hex color value
 * @param {string} color - The color to sanitize
 * @returns {string} - The sanitized hex color
 */
export const sanitizeHexColor = (color) => {
  if (typeof color !== 'string') {
    return '#ffffff';
  }

  // Remove any non-hex characters
  const cleaned = color.replace(/[^#a-fA-F0-9]/g, '');

  // Validate hex format
  if (/^#[a-fA-F0-9]{6}$/.test(cleaned)) {
    return cleaned.toLowerCase();
  }

  if (/^#[a-fA-F0-9]{3}$/.test(cleaned)) {
    // Expand shorthand (#fff -> #ffffff)
    const expanded =
      '#' +
      cleaned[1] +
      cleaned[1] +
      cleaned[2] +
      cleaned[2] +
      cleaned[3] +
      cleaned[3];
    return expanded.toLowerCase();
  }

  return '#ffffff';
};

/**
 * Sanitizes customer feedback
 * @param {object} feedback - The feedback data
 * @returns {object} - The sanitized feedback
 */
export const sanitizeFeedback = (feedback) => {
  return {
    rating: sanitizeInteger(feedback.rating, { min: 1, max: 5, defaultValue: 5 }),
    comment: sanitizeString(feedback.comment || '').substring(0, 1000), // Limit comment length
  };
};

export default {
  escapeHtml,
  stripHtmlTags,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeInteger,
  sanitizePrice,
  sanitizeObject,
  sanitizeMenuItem,
  sanitizeStoreConfig,
  sanitizeHexColor,
  sanitizeFeedback,
};
