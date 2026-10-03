class AppError extends Error {
  constructor({ code, message, cause, details } = {}) {
    super(message || "Application error.", { cause });
    this.name = "AppError";
    this.code = code || "UNKNOWN_ERROR";
    this.details = details;
    this.isOperational = true;
  }
}

module.exports = AppError;
