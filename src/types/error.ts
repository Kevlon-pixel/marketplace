export interface AppError extends Error {
  statusCode?: number;
  origin?: string;
}
