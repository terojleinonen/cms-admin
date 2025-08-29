/**
 * Test to verify Jest setup and polyfills are working correctly
 */

describe('Jest Setup Verification', () => {
  test('Web API polyfills are available', () => {
    expect(global.Request).toBeDefined();
    expect(global.Response).toBeDefined();
    expect(global.Headers).toBeDefined();
    expect(global.FormData).toBeDefined();
    expect(global.URL).toBeDefined();
    expect(global.URLSearchParams).toBeDefined();
    expect(global.fetch).toBeDefined();
  });

  test('Request polyfill works correctly', () => {
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    });

    expect(request.url).toBe('https://example.com/api');
    expect(request.method).toBe('POST');
    expect(request.headers.get('Content-Type')).toBe('application/json');
  });

  test('Response polyfill works correctly', () => {
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  test('Headers polyfill works correctly', () => {
    const headers = new Headers();
    headers.set('Authorization', 'Bearer token');
    headers.append('X-Custom', 'value1');
    headers.append('X-Custom', 'value2');

    expect(headers.get('Authorization')).toBe('Bearer token');
    expect(headers.get('X-Custom')).toBe('value1, value2');
    expect(headers.has('Authorization')).toBe(true);
  });

  test('FormData polyfill works correctly', () => {
    const formData = new FormData();
    formData.append('name', 'test');
    formData.append('file', 'content');

    expect(formData.get('name')).toBe('test');
    expect(formData.has('file')).toBe(true);
  });

  test('URLSearchParams polyfill works correctly', () => {
    const params = new URLSearchParams('?name=test&value=123');
    
    expect(params.get('name')).toBe('test');
    expect(params.get('value')).toBe('123');
    expect(params.has('name')).toBe(true);
  });

  test('Environment variables are set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.NEXTAUTH_SECRET).toBeDefined();
  });
});