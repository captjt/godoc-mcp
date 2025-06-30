import { describe, it } from 'vitest';
import { GoDocFetcher } from '../src/fetcher/index.js';

describe('Debug HTML Structure', () => {
  it('should inspect fmt package HTML', async () => {
    const fetcher = new GoDocFetcher();
    
    try {
      // Fetch raw HTML
      const response = await fetch('https://pkg.go.dev/fmt');
      const html = await response.text();
      
      // Log sections of HTML to understand structure
      console.log('\n=== Checking for function elements ===');
      const functionMatches = html.match(/id="Printf"[^>]*>/g);
      console.log('Printf matches:', functionMatches);
      
      console.log('\n=== Checking for type elements ===');
      const typeMatches = html.match(/id="Stringer"[^>]*>/g);
      console.log('Stringer matches:', typeMatches);
      
      console.log('\n=== Sample HTML around Printf ===');
      const printfIndex = html.indexOf('Printf');
      if (printfIndex > -1) {
        console.log(html.substring(printfIndex - 200, printfIndex + 500));
      }
      
    } catch (error) {
      console.error('Error fetching HTML:', error);
    }
  }, 60000); // 60 second timeout
});