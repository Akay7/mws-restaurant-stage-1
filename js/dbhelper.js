getIndexDB = new Promise(function createIndexDB(resolve) {
  let idbOpenRequest = indexedDB.open('restaurants-db', 1);
  idbOpenRequest.onerror = (event) => console.log('Open IDB error');
  idbOpenRequest.onsuccess = (event) => {
    console.log('Open IDB success');
    resolve(idbOpenRequest.result);
  };
  idbOpenRequest.onupgradeneeded = (event) => {
    let db = event.target.result;
    db.onerror = () => console.log('Error opening DB');

    db.createObjectStore('restaurants', { keyPath: 'id'});
    db.createObjectStore('reviews', { keyPath: 'id' });

    console.log('object store created');
  };
});


/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    return fetch(`${DBHelper.DATABASE_URL}restaurants`)
      .then(response => response.json())
      .then(restaurants => {
        callback(null, restaurants);
        return restaurants;
      })
      .then(restaurants => {
        getIndexDB.then(function (db) {
          let transaction = db.transaction(['restaurants'], 'readwrite');
          transaction.oncomplete = () => console.log('transaction success');
          transaction.onerror = () => console.log('transaction error');
          let objectStore = transaction.objectStore('restaurants');
          restaurants.forEach((restaurant) => {
            objectStore.put(restaurant);
            objectStore.onsuccess = () => console.log('success adding', restaurant);
          });
        });
      })
      .catch(error => {
        getIndexDB.then(function (db) {
          let transaction = db.transaction(['restaurants']);
          let objectStore = transaction.objectStore('restaurants');
          let getAllRequest = objectStore.getAll();
          getAllRequest.onsuccess = (event) => {
            callback(null, event.target.result);
          }
        })
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id === +id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type === cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood === neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine !== 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type === cuisine);
        }
        if (neighborhood !== 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood === neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Fetch all restaurant reviews by restaurant ID
   */
  static fetchRestaurantReviewsById(id, callback) {
    // fetch all restaurants with proper error handling.
    return fetch(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`)
      .then(response => response.json())
      .then(reviews => {
        callback(null, reviews);
        return reviews;
      })
      .then(reviews => {
        getIndexDB.then(function (db) {
          let transaction = db.transaction(['reviews'], 'readwrite');
          transaction.oncomplete = () => console.log('transaction success');
          transaction.onerror = () => console.log('transaction error');
          let objectStore = transaction.objectStore('reviews');
          objectStore.put({
            'id': id,
            'reviews': reviews
          });
          objectStore.onsuccess = () => console.log('success adding', restaurant);
        });
      })
      .catch(error => {
        getIndexDB.then(function (db) {
          let transaction = db.transaction(['reviews']);
          let objectStore = transaction.objectStore('reviews');
          let getRequest = objectStore.get(id);
          getRequest.onsuccess = (event) => {
            callback(null, event.target.result.reviews);
          }
        })
      });
  }

  /**
   * Post all restaurant review to restaurant.
   */
  static postRestaurantReview(review) {
    return fetch(`${DBHelper.DATABASE_URL}reviews/`, {
      method: 'POST',
      body: JSON.stringify(review)
    })
    .then(response => response.json())
    .catch(error => {
      throw new Error("Right now can't establish connection to server, will send later");
    })
  }


  /**
   * Set restaurant favorite/unfavorite
   */
  static postRestaurantFavoriteStatus(id, status) {
    return fetch(`${DBHelper.DATABASE_URL}restaurants/${id}/?is_favorite=${status}`, {
      method: 'POST'
    })
    .then(response => response.json())
    .then(restaurant => {
      getIndexDB.then(function (db) {
        let transaction = db.transaction(['restaurants'], 'readwrite');
        transaction.oncomplete = () => console.log('transaction success');
        transaction.onerror = () => console.log('transaction error');
        let objectStore = transaction.objectStore('restaurants');
        objectStore.put(restaurant);
        objectStore.onsuccess = () => console.log('success adding', restaurant);
      });
    })
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      });
      marker.addTo(newMap);
    return marker;
  }
}
