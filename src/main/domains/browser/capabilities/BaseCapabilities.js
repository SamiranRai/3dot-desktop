const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");
const ErrorHandler = require("../../../errors/ErrorHandler");

class BaseCapabilities {
  constructor(browserManager, requiredMethods, label) {
    if (!browserManager) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${label} requires a browserManager.`,
      });
    }

    const missing = requiredMethods.filter(
      (method) => typeof browserManager[method] !== "function",
    );

    if (missing.length) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${label} requires: ${missing.join(", ")}.`,
        details: { missing },
      });
    }

    this.browserManager = browserManager;
  }

  async runOperation(operationName, operation, failureCode = ErrorCodes.BROWSER_OPERATION_FAILED) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw ErrorHandler.normalizeError(error, {
        code: failureCode,
        message: `Operation "${operationName}" failed.`,
      });
    }
  }

  assertNonEmptyString(value, name, operation) {
    if (typeof value !== "string" || !value.trim()) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${operation}() requires a non-empty ${name} string.`,
      });
    }
  }

  assertOptionalString(value, name, operation) {
    if (value !== undefined && typeof value !== "string") {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${operation}() ${name} must be a string when provided.`,
      });
    }
  }
}

module.exports = BaseCapabilities;
