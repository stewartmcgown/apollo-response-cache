import 'apollo-cache-control'

declare module 'apollo-cache-control' {
  export interface CacheHint {
    maxAge?: number
    scope?: CacheScope

    /**
     * How long after maxAge this property can still be served from cache with a
     * STALE header attached
     */
    staleWhileRevalidate?: number
  }
}
