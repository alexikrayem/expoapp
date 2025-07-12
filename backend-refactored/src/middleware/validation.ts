import { z } from 'zod'

export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new ValidationError(message, error)
    }
    throw error
  }
}