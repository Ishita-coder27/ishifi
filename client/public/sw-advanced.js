// Tier 6: Advanced Service Worker with full offline support
// Uses IndexedDB for persistent offline storage

const CACHE_VERSION = 'ishifi-v2'
const ASSETS_CACHE = `${CACHE_VERSION}-assets`
const API_CACHE = `${CACHE_VERSION}-api`
const DB_NAME = 'IshiFi'

// IndexedDB stores
const STORES = {
  transactions: 'transactions',
  budgets: 'budgets',
  goals: 'goals',
  categories: 'categories',
  user: 'user',
  syncQueue: 'syncQueue' // Queue of changes to sync
}

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSETS_CACHE)
      console.log('[SW] Caching core assets')
      await cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err)
      })

      // Initialize IndexedDB
      await initializeDB()
      self.skipWaiting()
    })()
  )
})

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const caches_list = await caches.keys()
      for (const cacheName of caches_list) {
        if (cacheName !== ASSETS_CACHE && cacheName !== API_CACHE) {
          console.log('[SW] Deleting old cache:', cacheName)
          await caches.delete(cacheName)
        }
      }
      self.clients.claim()
    })()
  )
})

// Initialize IndexedDB
async function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Create object stores
      for (const [name, storeName] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: 'id',
            autoIncrement: true
          })

          // Add indexes
          if (storeName === 'transactions') {
            store.createIndex('userId', 'userId')
            store.createIndex('date', 'date')
          }
          if (storeName === 'syncQueue') {
            store.createIndex('timestamp', 'timestamp')
          }
        }
      }
    }
  })
}

// Get DB instance
async function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// Fetch: Network-first with intelligent caching
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and service worker updates
  if (request.method !== 'GET' || url.pathname.includes('sw.js')) {
    return
  }

  // Skip WebSocket
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return
  }

  // API calls: Network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
    return
  }

  // Assets: Cache-first
  event.respondWith(handleAssetRequest(request))
})

// Handle API requests with offline support
async function handleAPIRequest(request) {
  try {
    // Try network first
    const response = await fetch(request.clone())

    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())

      // Store data in IndexedDB for offline use
      if (request.method === 'GET') {
        const data = await response.clone().json()
        await storeInDB(request.url, data)
      }
    }

    return response
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, checking cache')
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Try IndexedDB
    const data = await getFromDB(request.url)
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
        statusText: 'OK (from cache)'
      })
    }

    // Return offline response
    return new Response(
      JSON.stringify({ error: 'Offline - no cached data available' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle asset requests
async function handleAssetRequest(request) {
  const cache = await caches.open(ASSETS_CACHE)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return cachedResponse || new Response('Offline', { status: 503 })
  }
}

// IndexedDB helpers
async function storeInDB(url, data) {
  try {
    const db = await getDB()
    const storeName = getStoreNameForURL(url)
    if (!storeName) return

    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    // Store with URL as reference
    await new Promise((resolve, reject) => {
      const req = store.put({
        ...data,
        _url: url,
        _timestamp: Date.now()
      })
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch (error) {
    console.warn('[SW] Failed to store in DB:', error)
  }
}

async function getFromDB(url) {
  try {
    const db = await getDB()
    const storeName = getStoreNameForURL(url)
    if (!storeName) return null

    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result[0] || null)
    })
  } catch (error) {
    console.warn('[SW] Failed to get from DB:', error)
    return null
  }
}

function getStoreNameForURL(url) {
  if (url.includes('/transactions')) return STORES.transactions
  if (url.includes('/budgets')) return STORES.budgets
  if (url.includes('/goals')) return STORES.goals
  if (url.includes('/categories')) return STORES.categories
  if (url.includes('/users/me')) return STORES.user
  return null
}

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineChanges())
  }
})

async function syncOfflineChanges() {
  console.log('[SW] Starting background sync')
  try {
    const db = await getDB()
    const transaction = db.transaction([STORES.syncQueue], 'readwrite')
    const store = transaction.objectStore(STORES.syncQueue)

    const queue = await new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result)
    })

    // Process each queued change
    for (const item of queue) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        })

        // Remove from queue on success
        await new Promise((resolve, reject) => {
          const req = store.delete(item.id)
          req.onerror = () => reject(req.error)
          req.onsuccess = () => resolve()
        })
      } catch (error) {
        console.warn('[SW] Sync failed for:', item.url, error)
      }
    }

    console.log('[SW] Sync complete')
  } catch (error) {
    console.warn('[SW] Sync error:', error)
  }
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data.type === 'GET_OFFLINE_STATUS') {
    // Return offline status to client
    event.ports[0].postMessage({
      type: 'OFFLINE_STATUS',
      offline: !navigator.onLine
    })
  }
})

console.log('[SW] Advanced service worker loaded with IndexedDB offline support')
