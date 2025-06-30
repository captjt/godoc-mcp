import { DocumentationCache } from '../../src/cache/index.js';

export function createTestCache(options?: { stdTTL?: number; checkperiod?: number; maxKeys?: number }) {
  return new DocumentationCache({
    stdTTL: options?.stdTTL || 60, // 1 minute for tests
    checkperiod: options?.checkperiod || 10,
    maxKeys: options?.maxKeys || 100
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function mockFetchResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html',
      ...headers
    }
  });
}

export const samplePackageHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="description" content="Package fmt implements formatted I/O with functions analogous to C's printf and scanf.">
</head>
<body>
  <div class="Documentation-overview">
    <p>Package fmt implements formatted I/O with functions analogous to C's printf and scanf.</p>
  </div>
  <div class="Documentation-function" id="Printf">
    <div class="Documentation-declaration">
      <pre>func Printf(format string, a ...any) (n int, err error)</pre>
    </div>
    <div class="Documentation-content">
      Printf formats according to a format specifier and writes to standard output.
    </div>
  </div>
  <div class="Documentation-type" id="Stringer">
    <div class="Documentation-declaration">
      <pre>type Stringer interface {
    String() string
}</pre>
    </div>
    <div class="Documentation-content">
      Stringer is implemented by any value that has a String method.
    </div>
  </div>
</body>
</html>
`;

export const sampleModuleIndex = `{"Path":"fmt","Version":"v1.0.0","Timestamp":"2023-01-01T00:00:00Z"}
{"Path":"fmt","Version":"v1.1.0","Timestamp":"2023-06-01T00:00:00Z"}
{"Path":"github.com/gin-gonic/gin","Version":"v1.8.0","Timestamp":"2022-06-01T00:00:00Z"}
{"Path":"github.com/gin-gonic/gin","Version":"v1.9.0","Timestamp":"2023-01-01T00:00:00Z"}
{"Path":"github.com/gin-gonic/gin","Version":"v1.9.1","Timestamp":"2023-06-01T00:00:00Z"}`;