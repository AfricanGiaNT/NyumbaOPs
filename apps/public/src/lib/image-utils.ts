/**
 * Transform Firebase Storage emulator URLs to use Next.js proxy
 * This avoids CORS issues when loading images from the emulator
 */
export function transformImageUrl(url: string): string {
  if (!url) return url;
  
  // Check if it's an emulator URL
  if (url.includes('127.0.0.1:9199') || url.includes('localhost:9199')) {
    // Extract the path after the emulator host
    const match = url.match(/(?:127\.0\.0\.1|localhost):9199(.+)/);
    if (match) {
      return `/storage-proxy${match[1]}`;
    }
  }
  
  return url;
}
