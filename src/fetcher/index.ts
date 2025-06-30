import * as cheerio from 'cheerio';
import { 
  PackageDoc, 
  FunctionDoc, 
  TypeDoc, 
  MethodDoc, 
  SearchResult, 
  CodeExample,
  FetcherOptions,
  GoDocError 
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class GoDocFetcher {
  private baseUrl = 'https://pkg.go.dev';
  private timeout: number;
  private userAgent: string;

  constructor(options?: FetcherOptions) {
    this.timeout = options?.timeout || 30000; // 30 seconds
    this.userAgent = options?.userAgent || 'godoc-mcp/1.0';
  }

  private async fetchHTML(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      logger.debug(`Fetching: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          const error = new Error(`Package not found: ${url}`) as GoDocError;
          error.code = 'NOT_FOUND';
          throw error;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout: ${url}`) as GoDocError;
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }

      if (error.code) {
        throw error;
      }

      const networkError = new Error(`Network error: ${error.message}`) as GoDocError;
      networkError.code = 'NETWORK_ERROR';
      networkError.details = error;
      throw networkError;
    }
  }

  async getPackageDoc(packagePath: string, version?: string): Promise<PackageDoc> {
    // If version is specified, append it to the URL
    const url = version 
      ? `${this.baseUrl}/${packagePath}@${version}`
      : `${this.baseUrl}/${packagePath}`;
    const html = await this.fetchHTML(url);
    const $ = cheerio.load(html);

    try {
      // Extract package information
      const name = packagePath.split('/').pop() || packagePath;
      const synopsis = $('meta[name="description"]').attr('content') || 
                      $('.Documentation-overview p').first().text().trim() ||
                      'No description available';

      // Get overview section
      const overview = $('.Documentation-overview').html() || undefined;

      // Get README if available
      const readme = $('#readme').html() || undefined;

      // Get subdirectories
      const subdirectories: string[] = [];
      $('.Directories-list a').each((_, el) => {
        const dir = $(el).text().trim();
        if (dir) subdirectories.push(dir);
      });

      // Get imports
      const imports: string[] = [];
      $('.Documentation-imports a').each((_, el) => {
        const imp = $(el).text().trim();
        if (imp) imports.push(imp);
      });

      // Extract version from the page if available
      const versionText = $('.Documentation-version').text().trim();
      const extractedVersion = versionText || version;

      return {
        name,
        importPath: packagePath,
        version: extractedVersion,
        synopsis,
        overview,
        readme,
        subdirectories: subdirectories.length > 0 ? subdirectories : undefined,
        imports: imports.length > 0 ? imports : undefined
      };
    } catch (error) {
      logger.error(`Error parsing package doc for ${packagePath}:`, error);
      const parseError = new Error(`Failed to parse package documentation`) as GoDocError;
      parseError.code = 'PARSE_ERROR';
      parseError.details = error;
      throw parseError;
    }
  }

  async getFunctionDoc(packagePath: string, functionName: string, version?: string): Promise<FunctionDoc> {
    const url = version 
      ? `${this.baseUrl}/${packagePath}@${version}`
      : `${this.baseUrl}/${packagePath}`;
    const html = await this.fetchHTML(url);
    const $ = cheerio.load(html);

    try {
      // Find the function section
      let signature = '';
      let documentation = '';
      let examples: CodeExample[] = [];

      // Look for function in the documentation
      $('[data-kind="function"]').each((_, el) => {
        const $el = $(el);
        const $header = $el.find('.Documentation-functionHeader');
        const funcName = $header.find('h4').attr('id');
        
        if (funcName === functionName) {
          // Get signature
          signature = $el.find('.Documentation-declaration pre').text().trim();
          
          // Get documentation
          documentation = $el.find('.Documentation-content').first().text().trim();
          
          // Get examples if any
          $el.find('.Documentation-exampleDetails').each((_, exEl) => {
            const $ex = $(exEl);
            const exampleName = $ex.find('.Documentation-exampleDetailsHeader').text().trim();
            const code = $ex.find('.Documentation-exampleCode pre').text().trim();
            const output = $ex.find('.Documentation-exampleOutput pre').text().trim();
            
            if (code) {
              examples.push({
                name: exampleName || 'Example',
                code,
                output: output || undefined
              });
            }
          });
        }
      });

      if (!signature) {
        const error = new Error(`Function ${functionName} not found in ${packagePath}`) as GoDocError;
        error.code = 'NOT_FOUND';
        throw error;
      }

      return {
        name: functionName,
        signature,
        documentation,
        examples: examples.length > 0 ? examples : undefined,
        packagePath
      };
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        throw error;
      }
      logger.error(`Error parsing function doc for ${functionName} in ${packagePath}:`, error);
      const parseError = new Error(`Failed to parse function documentation`) as GoDocError;
      parseError.code = 'PARSE_ERROR';
      parseError.details = error;
      throw parseError;
    }
  }

  async getTypeDoc(packagePath: string, typeName: string, version?: string): Promise<TypeDoc> {
    const url = version 
      ? `${this.baseUrl}/${packagePath}@${version}`
      : `${this.baseUrl}/${packagePath}`;
    const html = await this.fetchHTML(url);
    const $ = cheerio.load(html);

    try {
      let definition = '';
      let documentation = '';
      let methods: MethodDoc[] = [];

      // Look for type in the documentation
      $('[data-kind="type"]').each((_, el) => {
        const $el = $(el);
        const $header = $el.find('.Documentation-typeHeader');
        const typeId = $header.find('h4').attr('id');
        
        if (typeId === typeName) {
          // Get definition
          definition = $el.find('.Documentation-declaration pre').text().trim();
          
          // Get documentation
          documentation = $el.find('.Documentation-content').first().text().trim();
        }
      });

      // Look for methods
      $('[data-kind="method"]').each((_, el) => {
        const $el = $(el);
        const $header = $el.find('.Documentation-functionHeader');
        const methodId = $header.find('h4').attr('id') || '';
        
        // Check if this method belongs to our type
        if (methodId && methodId.startsWith(`${typeName}.`)) {
          const methodName = methodId.replace(`${typeName}.`, '');
          const methodSignature = $el.find('.Documentation-declaration pre').text().trim();
          const methodDoc = $el.find('.Documentation-content').first().text().trim();
          
          if (methodSignature) {
            methods.push({
              name: methodName,
              signature: methodSignature,
              documentation: methodDoc,
              receiver: typeName
            });
          }
        }
      });

      if (!definition) {
        const error = new Error(`Type ${typeName} not found in ${packagePath}`) as GoDocError;
        error.code = 'NOT_FOUND';
        throw error;
      }

      return {
        name: typeName,
        definition,
        documentation,
        methods: methods.length > 0 ? methods : undefined,
        packagePath
      };
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        throw error;
      }
      logger.error(`Error parsing type doc for ${typeName} in ${packagePath}:`, error);
      const parseError = new Error(`Failed to parse type documentation`) as GoDocError;
      parseError.code = 'PARSE_ERROR';
      parseError.details = error;
      throw parseError;
    }
  }

  async searchPackages(query: string, limit: number = 10): Promise<SearchResult[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const html = await this.fetchHTML(url);
    const $ = cheerio.load(html);

    try {
      const results: SearchResult[] = [];

      // Try multiple selectors for search results
      const searchSelectors = [
        '.SearchSnippet',
        '[data-test-id="snippet-title"]',
        '.SearchResult',
        'article'
      ];

      let found = false;
      for (const selector of searchSelectors) {
        $(selector).each((_, el) => {
          const $el = $(el);
          
          // Try to find the package path
          const link = $el.find('a').first();
          const href = link.attr('href') || '';
          const path = href.replace(/^\//, '').split('@')[0]; // Remove leading slash and version
          
          // Try to find the name
          const name = link.text().trim() || 
                      $el.find('.SearchSnippet-header').text().trim() ||
                      $el.find('h2').text().trim() ||
                      path.split('/').pop() || '';
          
          // Try to find synopsis
          const synopsis = $el.find('.SearchSnippet-synopsis').text().trim() ||
                          $el.find('p').first().text().trim() ||
                          $el.find('[data-test-id="snippet-synopsis"]').text().trim() ||
                          'No description available';

          if (path && name && !results.find(r => r.path === path)) {
            results.push({
              path,
              name,
              synopsis
            });
            found = true;
          }
        });
        
        if (found) break;
      }

      return results;
    } catch (error) {
      logger.error(`Error searching packages with query "${query}":`, error);
      const parseError = new Error(`Failed to search packages`) as GoDocError;
      parseError.code = 'PARSE_ERROR';
      parseError.details = error;
      throw parseError;
    }
  }

  async getPackageExamples(packagePath: string, version?: string): Promise<CodeExample[]> {
    const url = version 
      ? `${this.baseUrl}/${packagePath}@${version}`
      : `${this.baseUrl}/${packagePath}`;
    const html = await this.fetchHTML(url);
    const $ = cheerio.load(html);

    try {
      const examples: CodeExample[] = [];

      $('.Documentation-example').each((_, el) => {
        const $el = $(el);
        const name = $el.find('.Documentation-exampleHeader').text().trim();
        const code = $el.find('.Documentation-exampleCode pre').text().trim();
        const output = $el.find('.Documentation-exampleOutput pre').text().trim();

        if (code) {
          examples.push({
            name: name || 'Example',
            code,
            output: output || undefined
          });
        }
      });

      return examples;
    } catch (error) {
      logger.error(`Error getting examples for ${packagePath}:`, error);
      const parseError = new Error(`Failed to get package examples`) as GoDocError;
      parseError.code = 'PARSE_ERROR';
      parseError.details = error;
      throw parseError;
    }
  }
}