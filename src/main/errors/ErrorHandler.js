const AppError = require("./../errors/AppError");
const ErrorCodes = require("./../errors/ErrorCodes");

class ErrorHandler {
  // Error Normalization
  static normalizeError(error) {
    // Check if the error is already an instance of AppError
    if (error instanceof AppError) {
      return error;
    }

    // If it's a standard Error, wrap it in an AppError
    return new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: "An unexpected error occurred.",
      cause: error,
    });
  }

  // Error Response Formatting
  static toResponse(error) {
    const normalizedError = this.normalizeError(error);
    return {
      code: normalizedError.code,
      message: normalizedError.message,
      details: normalizedError.details,
    };
  }
}

module.exports = ErrorHandler;
