export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export class ApiError extends Error {
  public statusCode?: number;
  public fieldErrors?: Record<string, string>;
  public details?: string;

  constructor(
    message: string,
    statusCode?: number,
    fieldErrors?: Record<string, string>,
    details?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
