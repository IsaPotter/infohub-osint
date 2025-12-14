const validator = require('validator');

function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a string' };
  }
  
  const trimmed = query.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Query too short (minimum 2 characters)' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Query too long (maximum 100 characters)' };
  }
  
  if (!/^[a-zA-Z0-9@._\-+\s()]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid characters detected' };
  }
  
  return { valid: true, query: trimmed };
}

function detectQueryType(query) {
  if (validator.isEmail(query)) return 'email';
  if (validator.isFQDN(query)) return 'domain';
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^0x[a-fA-F0-9]{40}$/.test(query)) return 'crypto';
  return 'social';
}

function sanitizeInput(input) {
  return validator.escape(input.trim());
}

module.exports = {
  validateSearchQuery,
  detectQueryType,
  sanitizeInput
};