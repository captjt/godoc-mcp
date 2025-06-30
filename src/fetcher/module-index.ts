import { ModuleVersion, PackageVersions } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ModuleIndexFetcher {
  private indexUrl = 'https://index.golang.org/index';
  private timeout: number;
  private cachedIndex: ModuleVersion[] | null = null;
  private lastFetchTime: number = 0;
  private indexCacheTTL = 3600000; // 1 hour in milliseconds

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  private async fetchIndex(): Promise<ModuleVersion[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      logger.debug('Fetching Go module index...');
      const response = await fetch(this.indexUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.trim().split('\n');
      const modules: ModuleVersion[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          modules.push({
            path: parsed.Path || parsed.path,
            version: parsed.Version || parsed.version,
            timestamp: parsed.Timestamp || parsed.timestamp
          });
        } catch (e) {
          logger.warn(`Failed to parse module index line: ${line}`);
        }
      }

      logger.info(`Fetched ${modules.length} modules from index`);
      return modules;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Module index fetch timeout');
      }
      
      throw new Error(`Failed to fetch module index: ${error.message}`);
    }
  }

  async getIndex(): Promise<ModuleVersion[]> {
    const now = Date.now();
    
    // Return cached index if still fresh
    if (this.cachedIndex && (now - this.lastFetchTime) < this.indexCacheTTL) {
      logger.debug('Using cached module index');
      return this.cachedIndex;
    }

    // Fetch fresh index
    this.cachedIndex = await this.fetchIndex();
    this.lastFetchTime = now;
    return this.cachedIndex;
  }

  async getPackageVersions(packagePath: string): Promise<PackageVersions | null> {
    const index = await this.getIndex();
    
    // Filter modules for this package
    const versions = index
      .filter(m => m.path === packagePath)
      .map(m => ({
        version: m.version,
        timestamp: m.timestamp
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (versions.length === 0) {
      return null;
    }

    // Determine latest stable version
    const stableVersions = versions.filter(v => !v.version.includes('-'));
    const latest = stableVersions.length > 0 ? stableVersions[0].version : versions[0].version;

    return {
      path: packagePath,
      versions,
      latest
    };
  }

  async getLatestVersion(packagePath: string): Promise<string | null> {
    const packageVersions = await this.getPackageVersions(packagePath);
    return packageVersions?.latest || null;
  }

  async searchPackages(query: string): Promise<Array<{ path: string; latest: string }>> {
    const index = await this.getIndex();
    const queryLower = query.toLowerCase();
    
    // Group by package path
    const packageMap = new Map<string, ModuleVersion[]>();
    
    for (const module of index) {
      if (module.path.toLowerCase().includes(queryLower)) {
        const existing = packageMap.get(module.path) || [];
        existing.push(module);
        packageMap.set(module.path, existing);
      }
    }

    // Get latest version for each matching package
    const results: Array<{ path: string; latest: string }> = [];
    
    for (const [path, versions] of packageMap.entries()) {
      const sorted = versions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Prefer stable versions
      const stableVersion = sorted.find(v => !v.version.includes('-'));
      const latest = stableVersion || sorted[0];
      
      results.push({
        path,
        latest: latest.version
      });
    }

    return results.slice(0, 50); // Limit results
  }
}