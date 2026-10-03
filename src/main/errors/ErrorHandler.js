const AppError = require("./AppError");
const ErrorCodes = require("./ErrorCodes");

class ErrorHandler {
  static normalizeError(error, fallback = {}) {
    if (error instanceof AppError) return error;

    return new AppError({
      code: fallback.code || ErrorCodes.BROWSER_OPERATION_FAILED,
      message: fallback.message || error?.message || "An unexpected error occurred.",
      cause: error,
      details: fallback.details,
    });
  }

  static toResponse(error) {
    const normalized = this.normalizeError(error);

    return {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
    };
  }
}

module.exports = ErrorHandler;
