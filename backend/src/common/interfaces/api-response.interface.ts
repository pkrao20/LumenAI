export interface ApiResponse<T = unknown> {
  success: boolean;
  error: string;
  message: string;
  data: T;
}
