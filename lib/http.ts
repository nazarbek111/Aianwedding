export class RequestBodyError extends Error {
  constructor(readonly status: number) { super('Invalid request body'); }
}

export async function readJsonBody<T>(request: Request, limitBytes = 16 * 1024): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > limitBytes) throw new RequestBodyError(413);
  if (!request.body) throw new RequestBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limitBytes) { await reader.cancel(); throw new RequestBodyError(413); }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(body)) as T; }
  catch { throw new RequestBodyError(400); }
}
