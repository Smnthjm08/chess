import type { Response } from "express";

export function refuse(
  res: Response,
  status: number,
  error: string,
  data: unknown = null,
) {
  return res.status(status).json({
    success: false,
    error,
    data,
    message: error,
  });
}

export function refuseInternal(res: Response, error: unknown) {
  return refuse(
    res,
    500,
    error instanceof Error ? error.message : "Unknown error",
  );
}
