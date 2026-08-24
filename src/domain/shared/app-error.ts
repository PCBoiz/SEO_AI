export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ErrorDetails;

  constructor(
    code: string,
    message: string,
    options: {
      status?: number;
      details?: ErrorDetails;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.status = options.status ?? 500;
    this.details = options.details ?? {};
  }
}

export class ConfigurationError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, { status: 500, details });
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, { status: 400, details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Bạn cần đăng nhập để tiếp tục.") {
    super("UNAUTHENTICATED", message, { status: 401 });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Bạn không có quyền thực hiện thao tác này.") {
    super("FORBIDDEN", message, { status: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, { status: 404, details });
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details: ErrorDetails = {}) {
    super(code, message, { status: 409, details });
  }
}
