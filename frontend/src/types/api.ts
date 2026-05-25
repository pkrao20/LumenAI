export interface ApiError {
  success: false;
  error: string;
  message: string;
  data: Record<string, unknown>;
}

