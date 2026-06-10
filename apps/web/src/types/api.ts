import z from "zod"

export const ResponseMetaDataSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ResponseMetaData = z.infer<typeof ResponseMetaDataSchema>

export type ApiSuccessResponse<T = void> = T extends void
  ? { message?: string }
  : { result: T & ResponseMetaData; message?: string }

export type ApiErrorResponse = {
  message: string
  errors?: Record<string, string[]>
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export type UpdateData<T> = T & {
  id: string
}

