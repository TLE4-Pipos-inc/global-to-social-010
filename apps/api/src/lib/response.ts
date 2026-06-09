import type { Response } from "express"

/**
 * Send a successful JSON response.
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * - `200` OK - standard success
 * - `201` Created - resource was created
 * - `204` No Content - success but no body (e.g. delete)
 * @param data - Response payload
 * @param message - Optional human-readable message
 */
export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  options: { result?: T; message?: string } = {}
): void => {
  const { result, message } = options
  res.status(statusCode).json({ result, message })
}

/**
 * Send an error JSON response.
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * - `400` Bad Request - invalid input or validation failure
 * - `401` Unauthorized - missing or invalid authentication
 * - `403` Forbidden - authenticated but lacks permission
 * - `404` Not Found - resource does not exist
 * - `409` Conflict - duplicate or state conflict (e.g. email already exists)
 * - `422` Unprocessable Entity - valid syntax but semantic errors
 * - `429` Too Many Requests - rate limit exceeded
 * - `500` Internal Server Error - unexpected server failure
 * @param message - Human-readable error message
 * @param errors - Optional field-level errors (e.g. from Zod `flattenError().fieldErrors`)
 */
export const sendError = (
  res: Response,
  statusCode: number,
  options: { message: string; errors?: Record<string, string[]> | null }
): void => {
  const { message, errors } = options
  res.status(statusCode).json({ message, ...(errors && { errors }) })
}
