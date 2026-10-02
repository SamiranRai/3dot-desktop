// Domain-agnostic envelope shapes, used by every Domain
export interface IPCSuccess<T> {
  success: true;
  operation: string;
  data: T;
}

export interface IPCError {
  code: string;
  message: string;
  details: unknown;
}
export interface IPCFailure {
  success: false;
  operation: string;
  error: IPCError; // IPCError //
}

export type IPCResult<T> = IPCSuccess<T> | IPCFailure;

// Main to Renderer event subscription envelope
export type Unsubscribe = () => void;
