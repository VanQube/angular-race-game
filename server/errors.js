export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

const STATUS_BY_CODE = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ROUTE_NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.INTERNAL_ERROR]: 500
};

export class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 500;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'authentication is required') {
    return new ApiError(ErrorCode.UNAUTHORIZED, message);
  }

  static notFound(message = 'resource not found') {
    return new ApiError(ErrorCode.NOT_FOUND, message);
  }

  static conflict(message, details) {
    return new ApiError(ErrorCode.CONFLICT, message, details);
  }
}

/** Wraps an async Express handler so rejected promises reach the error middleware. */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: ErrorCode.ROUTE_NOT_FOUND,
      message: `no route matches ${req.method} ${req.originalUrl}`
    }
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) {
      body.error.details = err.details;
    }
    res.status(err.status).json(body);
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'an unexpected error occurred'
    }
  });
}
