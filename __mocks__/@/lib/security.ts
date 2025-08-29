export const securityService = {
  validateInput: jest.fn(),
  sanitizeHtml: jest.fn(),
  checkPermissions: jest.fn(),
  logSecurityEvent: jest.fn(),
  detectThreat: jest.fn(),
};

export const validateCSRF = jest.fn();
export const generateSecureToken = jest.fn();
export const hashSensitiveData = jest.fn();