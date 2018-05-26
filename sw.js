const staticCacheName = 'mws-restaurant';


self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll([
        '/',
        'index.html',
        'restaurant.html',
        'js/main.js',
        'js/restaurant_info.js',

        'js/dbhelper.js',

        'css/styles.css'
      ])
    })
  )
});

self.addEventListener('fetch', function (event) {
  if (event.request.url.endsWith('.jpg')) {
    event.respondWith(
      caches.open('mws-restaurant-img')
        .then(function (cache) {
          return cache.match(event.request.url).then(function (response) {
            if (response) return response;
            return fetch(event.request).then(function (response) {
              cache.put(event.request, response.clone());
              return response;
            })
          })
        })
    )
  }
  else {
    // TODO: change if statement to regex url processing
    if (event.request.url.includes('restaurant.html')) {
      event.respondWith(
        caches.match('restaurant.html').then(function(response) {
          if (response) return response;
          return fetch(event.request);
        })
      )
    }
    else {
      event.respondWith(
        caches.match(event.request).then(function (response) {
          if (response) return response;
          return fetch(event.request);
        })
      );
    }
  }
});