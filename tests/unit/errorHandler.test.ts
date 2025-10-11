import type { Response } from 'express';
import { errorHandler } from '@/middleware/errorHandler';
import logger from '@/lib/logger';

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  (res.status as jest.Mock).mockReturnValue(res);

  return res;
};

describe('errorHandler middleware', () => {
  const mockedLogger = logger as unknown as { error: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 500 with the error message when given an Error instance', () => {
    const error = new Error('Something went wrong');
    const res = createResponse();

    errorHandler(error, {} as never, res as unknown as Response, {} as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Something went wrong' });
    expect(mockedLogger.error).toHaveBeenCalledWith({ err: error }, 'Unhandled error');
  });

  it('falls back to "Unknown error" when given a non-Error value', () => {
    const unknownError = 'unexpected';
    const res = createResponse();

    errorHandler(unknownError, {} as never, res as unknown as Response, {} as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unknown error' });
    expect(mockedLogger.error).toHaveBeenCalledWith({ err: unknownError }, 'Unhandled error');
  });
});
