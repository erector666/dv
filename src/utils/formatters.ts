/**
 * Format file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format date to a human-readable string
 * @param date Date object or string
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | any | null | undefined
): string => {
  // Handle null, undefined, or invalid dates
  if (!date) return 'Unknown date';

  // Handle empty objects {} - return Unknown date silently
  if (typeof date === 'object' && Object.keys(date).length === 0) {
    return 'Unknown date';
  }

  try {
    let dateObj: Date;

    // Handle Firestore Timestamp objects
    if (
      date &&
      typeof date === 'object' &&
      date.toDate &&
      typeof date.toDate === 'function'
    ) {
      dateObj = date.toDate();
    }
    // Handle Firestore Timestamp with seconds/nanoseconds
    else if (date && typeof date === 'object' && date.seconds !== undefined) {
      dateObj = new Date(
        date.seconds * 1000 + (date.nanoseconds || 0) / 1000000
      );
    }
    // Handle regular Date objects and strings
    else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Handle various string formats
      if (date === '' || date === 'null' || date === 'undefined') {
        return 'Unknown date';
      }
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      // Handle timestamp numbers
      dateObj = new Date(date);
    } else {
      // Try to convert to string first, then to Date
      const dateString = String(date);
      if (dateString === '' || dateString === 'null' || dateString === 'undefined') {
        return 'Unknown date';
      }
      dateObj = new Date(dateString);
    }

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date format:', date);
      return 'Unknown date';
    }

    // Check if the date is very old (before 1970) or very new (after 2100)
    const year = dateObj.getFullYear();
    if (year < 1970 || year > 2100) {
      return 'Unknown date';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'Unknown date';
  }
};

/**
 * Format a timestamp in milliseconds to a relative time string
 * @param timestamp Timestamp in milliseconds
 * @returns Relative time string (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  // Convert to seconds
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  // Convert to minutes
  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Convert to hours
  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Convert to days
  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  // Convert to months
  const months = Math.floor(days / 30);

  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  // Convert to years
  const years = Math.floor(months / 12);

  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

/**
 * Format date with fallback for unknown dates
 * @param date Date object or string
 * @param fallbackText Fallback text when date is unknown
 * @returns Formatted date string or fallback text
 */
export const formatDateWithFallback = (
  date: Date | string | any | null | undefined,
  fallbackText: string = 'Recently uploaded'
): string => {
  const formatted = formatDate(date);
  if (formatted === 'Unknown date') {
    return fallbackText;
  }
  return formatted;
};

/**
 * Truncate text to a specified length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
