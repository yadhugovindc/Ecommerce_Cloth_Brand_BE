export interface ApiError extends Error {
  status?: number;
}

export function createError(message: string, status = 400): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}