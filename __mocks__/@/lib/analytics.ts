export const analyticsService = {
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
  group: jest.fn(),
  alias: jest.fn(),
};

export const getAnalytics = jest.fn(() => analyticsService);

export const trackEvent = jest.fn();
export const trackPageView = jest.fn();
export const trackUserAction = jest.fn();