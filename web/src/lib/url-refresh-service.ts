import { imageUploadService } from './image-upload'

interface UrlEntry {
  url: string
  storagePath: string
  createdAt: number
  expiresAt: number
  refreshCount: number
}

export class UrlRefreshService {
  private urlMap = new Map<string, UrlEntry>()
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly REFRESH_INTERVAL = 60 * 60 * 1000 // Check every hour
  private readonly REFRESH_THRESHOLD = 2 * 60 * 60 * 1000 // Refresh 2 hours before expiry

  constructor() {
    this.startRefreshTimer()
  }

  /**
   * Register a URL for proactive refresh
   */
  registerUrl(url: string, storagePath: string, expiresInSeconds: number = 86400) {
    const now = Date.now()
    const expiresAt = now + (expiresInSeconds * 1000)
    
    this.urlMap.set(url, {
      url,
      storagePath,
      createdAt: now,
      expiresAt,
      refreshCount: 0
    })

    console.log(`Registered URL for refresh: ${storagePath} (expires at ${new Date(expiresAt).toISOString()})`)
  }

  /**
   * Unregister a URL (e.g., when element is deleted)
   */
  unregisterUrl(url: string) {
    this.urlMap.delete(url)
  }

  /**
   * Get fresh URL for a storage path
   */
  async getRefreshedUrl(storagePath: string): Promise<string> {
    try {
      const freshUrl = await imageUploadService.getSignedUrl(storagePath, 86400)
      
      // Update the registry with the new URL
      const oldEntry = Array.from(this.urlMap.values()).find(entry => entry.storagePath === storagePath)
      if (oldEntry) {
        this.urlMap.delete(oldEntry.url)
        this.registerUrl(freshUrl, storagePath, 86400)
      }
      
      return freshUrl
    } catch (error) {
      console.error(`Failed to refresh URL for ${storagePath}:`, error)
      throw error
    }
  }

  /**
   * Check URLs that need refresh and refresh them proactively
   */
  private async refreshExpiredUrls() {
    const now = Date.now()
    const urlsToRefresh: UrlEntry[] = []

    // Find URLs that are approaching expiry
    for (const entry of this.urlMap.values()) {
      const timeUntilExpiry = entry.expiresAt - now
      if (timeUntilExpiry <= this.REFRESH_THRESHOLD && timeUntilExpiry > 0) {
        urlsToRefresh.push(entry)
      } else if (timeUntilExpiry <= 0) {
        // URL has already expired, mark for immediate refresh
        urlsToRefresh.push(entry)
      }
    }

    // Refresh URLs in batches to avoid overwhelming the API
    const batchSize = 10
    for (let i = 0; i < urlsToRefresh.length; i += batchSize) {
      const batch = urlsToRefresh.slice(i, i + batchSize)
      
      await Promise.allSettled(batch.map(async (entry) => {
        try {
          console.log(`Proactively refreshing URL for: ${entry.storagePath}`)
          const freshUrl = await imageUploadService.getSignedUrl(entry.storagePath, 86400)
          
          // Remove old entry and add new one
          this.urlMap.delete(entry.url)
          this.registerUrl(freshUrl, entry.storagePath, 86400)
          
          // Dispatch custom event to notify components about URL refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('imageUrlRefreshed', {
              detail: {
                oldUrl: entry.url,
                newUrl: freshUrl,
                storagePath: entry.storagePath
              }
            }))
          }
          
        } catch (error) {
          console.error(`Failed to refresh URL for ${entry.storagePath}:`, error)
          entry.refreshCount++
          
          // Remove URLs that fail to refresh multiple times
          if (entry.refreshCount >= 3) {
            console.warn(`Removing URL after 3 failed refresh attempts: ${entry.storagePath}`)
            this.urlMap.delete(entry.url)
          }
        }
      }))

      // Small delay between batches
      if (i + batchSize < urlsToRefresh.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Start the background refresh timer
   */
  private startRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    this.refreshTimer = setInterval(() => {
      this.refreshExpiredUrls().catch(error => {
        console.error('Error during background URL refresh:', error)
      })
    }, this.REFRESH_INTERVAL)
  }

  /**
   * Stop the background refresh timer
   */
  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Get status information about registered URLs
   */
  getStatus() {
    const now = Date.now()
    const urls = Array.from(this.urlMap.values())
    
    return {
      totalUrls: urls.length,
      expiredUrls: urls.filter(entry => entry.expiresAt <= now).length,
      urlsNeedingRefresh: urls.filter(entry => 
        entry.expiresAt - now <= this.REFRESH_THRESHOLD && entry.expiresAt > now
      ).length,
      nextRefreshCheck: this.refreshTimer ? new Date(Date.now() + this.REFRESH_INTERVAL) : null
    }
  }

  /**
   * Clean up expired entries that are no longer needed
   */
  cleanup() {
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    
    for (const [url, entry] of this.urlMap.entries()) {
      if (now - entry.createdAt > maxAge) {
        this.urlMap.delete(url)
      }
    }
  }
}

// Singleton instance
export const urlRefreshService = new UrlRefreshService()

// Clean up service when page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    urlRefreshService.stopRefreshTimer()
  })
}