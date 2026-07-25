const CACHE_NAME = 'project-hawk-cache-v3';

const CORE_ASSETS = [
    './index.html',
    './main.css',
    './game.js',
    './settings.json',
    './items.json',
    './story.json',
    './manifest.webmanifest',
    '../public/start/icon.png',
    '../public/start/fail.png',
    '../public/start/title_screen.png'
];

function isCacheableResponse(response) {
    return response &&
        response.ok &&
        !response.redirected &&
        response.type !== 'opaqueredirect';
}

function isImageRequest(request) {
    return /\.(png|jpg|jpeg|webp|gif)$/i.test(new URL(request.url).pathname);
}

async function cacheAsset(cache, asset) {
    try {
        const response = await fetch(asset, { redirect: 'follow' });

        if (!isCacheableResponse(response)) {
            return;
        }

        await cache.put(asset, response);
    } catch (error) {
        console.warn(`Asset konnte nicht gecached werden: ${asset}`, error);
    }
}

async function cacheAssets(assets) {
    const cache = await caches.open(CACHE_NAME);

    for (const asset of assets) {
        await cacheAsset(cache, asset);
    }
}

self.addEventListener('install', event => {
    event.waitUntil(
        cacheAssets(CORE_ASSETS)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'CACHE_ASSETS') return;

    const assets = Array.isArray(event.data.assets) ? event.data.assets : [];

    event.waitUntil(cacheAssets(assets));
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    if (isImageRequest(event.request)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request)
                        .then(networkResponse => {
                            if (!isCacheableResponse(networkResponse)) {
                                return networkResponse;
                            }

                            const responseClone = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone))
                                .catch(error => {
                                    console.warn('Bild konnte nicht gecached werden:', error);
                                });

                            return networkResponse;
                        });
                })
        );

        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (!isCacheableResponse(networkResponse)) {
                    return networkResponse;
                }

                const responseClone = networkResponse.clone();

                caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, responseClone))
                    .catch(error => {
                        console.warn('Response konnte nicht gecached werden:', error);
                    });

                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then(cachedResponse => {
                        return cachedResponse || caches.match('./index.html');
                    });
            })
    );
});