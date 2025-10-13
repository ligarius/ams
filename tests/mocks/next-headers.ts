export const headers = jest.fn(() => ({
  get: () => null,
}));

export const cookies = jest.fn(() => ({
  getAll: () => [],
}));
