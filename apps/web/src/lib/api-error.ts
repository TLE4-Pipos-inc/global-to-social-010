import type { ApiErrorResponse } from "#/types/api"
import { toast } from "sonner"

async function formatErrorResponse(res: Response): Promise<never> {
  const errorData = (await res.json()) as ApiErrorResponse
  console.log("API Error:", {
    status: res.status,
    statusText: res.statusText,
    message: errorData.message,
    errors: errorData.errors,
  })
  // TODO: For development, easier then the console
  toast.error(`API Error: ${errorData.message}`)

  throw new Error(errorData.message, { cause: errorData.errors })
}

export { formatErrorResponse }
