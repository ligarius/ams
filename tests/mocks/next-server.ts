export class NextResponse {
  static json<T>(body: T, init?: { status?: number; headers?: Record<string, string> }) {
    return {
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    };
  }
}
