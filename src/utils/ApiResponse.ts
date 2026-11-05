export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export class ApiResponse {
  public static success<T>(message: string, data?: T): IApiResponse<T> {
    return {
      success: true,
      message,
      ...(data !== undefined ? { data } : {}),
      timestamp: new Date().toISOString(),
    };
  }

  public static error(message: string, details?: unknown) {
    return {
      success: false,
      message,
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
    };
  }
}

