export interface ApiProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  traceId?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ApiProblemDetails,
  ) {
    super(problem.detail ?? problem.title ?? 'Yêu cầu không thành công')
    this.name = 'ApiError'
  }
}
