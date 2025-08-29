export const searchService = {
  search: jest.fn(),
  index: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
  getSuggestions: jest.fn(),
};

export const createSearchIndex = jest.fn(() => searchService);
export const performSearch = jest.fn();
export const getSearchSuggestions = jest.fn();