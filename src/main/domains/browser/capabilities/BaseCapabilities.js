const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");
const ErrorHandler = require("../../../errors/ErrorHandler");

/**
 * Shared scaffolding for capability classes wrapping a browserManager.
 * Validates required methods exist, and normalizes any thrown error
 * into an AppError so every capability produces a consistent shape.
 *
 * Does NOT and should never handle authorization/sender validation —
 * that's the IPC adapter's job at the trust boundary. This class only
 * validates that a call is well-formed on its own terms, since
 * Capabilities is a standalone domain API that other callers (tests,
 * shortcuts, a future second adapter) could use directly.
 */
class BaseCapabilities {
  constructor(browserManager, requiredMethods, label) {
    const missing = requiredMethods.filter(
      (method) => typeof browserManager?.[method] !== "function",
    );

    if (missing.length > 0) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${label} requires a browserManager exposing: ${missing.join(", ")}`,
        details: { missing },
      });
    }

    this.browserManager = browserManager;
  }

  /** @protected */
  runOperation(
    operationName,
    fn,
    failureCode = ErrorCodes.BROWSER_OPERATION_FAILED,
  ) {
    try {
      return fn();
    } catch (cause) {
      if (cause instanceof AppError) throw cause;
      throw new AppError({
        code: failureCode,
        message: `Operation "${operationName}" failed.`,
        cause: ErrorHandler.normalizeError(cause).cause || cause,
      });
    }
  }

  /** @protected */
  assertNonEmptyString(value, argName, operationName) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${operationName}() requires a non-empty ${argName} string.`,
      });
    }
  }

  /** @protected */
  assertOptionalString(value, argName, operationName) {
    if (value !== undefined && typeof value !== "string") {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: `${operationName}() ${argName} must be a string when provided.`,
      });
    }
  }
}

module.exports = BaseCapabilities;
