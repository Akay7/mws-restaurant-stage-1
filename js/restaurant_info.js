let restaurant;
var newMap;
let sendReviewWorker = new Worker('js/send_review_worker.js');

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYWtheTciLCJhIjoiY2ppdzB0c2R2MDNxbzNxcGZyM3NnY204ZiJ9.N6MmWl5qKFMEfFr-dCOdrw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
    DBHelper.fetchRestaurantReviewsById(id, (error, reviews) => {
      self.restaurantReviews = reviews;
      if (!reviews) {
        console.error(error);
        return;
      }
      fillReviewsHTML();
    })
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favorite = document.getElementById('restaurant-favorite');
  favorite.setAttribute("aria-pressed", restaurant.is_favorite);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Image of ${restaurant.name} restaurant`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurantReviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.className = 'restaurant-review';

  const name = document.createElement('h4');
  name.innerHTML = review.name;
  name.className = 'name';
  li.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = (new Date(review.createdAt)).toLocaleString();
  date.className = 'date';
  name.appendChild(date);

  const rating = document.createElement('span');
  rating.innerHTML = 'Rating: ' + '★'.repeat(review.rating) + '☆'.repeat(5-review.rating);
  rating.setAttribute('aria-label', `Rating: ${review.rating}`);
  rating.className = 'rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'comment';
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const link = document.createElement('a');
  link.innerHTML = restaurant.name;
  link.href = DBHelper.urlForRestaurant(restaurant);
  link.setAttribute('aria-current', 'page');
  li.appendChild(link);
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};


sendReview = (form) => {
  let payload = {
    'restaurant_id': self.restaurant.id,
    'name': form.name.value,
    'rating': form.rating.value,
    'comments': form.comments.value
  };
  form.submitBtn.disabled = true;

  let addReviewAndResetForm = (review) => {
      const container = document.getElementById('reviews-container');
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(review));
      container.appendChild(ul);
      form.reset();
      form.submitBtn.disabled = false;
  };

  DBHelper.postRestaurantReview(payload)
    .then(review => {
      addReviewAndResetForm(review);
    })
    .catch(error => {
      alert("Can't establish connection with server. Your review will resend automatically.");
      sendReviewWorker.onmessage = (message) => {
        addReviewAndResetForm(message.data);
        alert("Your message successfully sent.");
      };
      sendReviewWorker.postMessage(payload);
    })
};

toggleFavorite = (event) => {
  let element = event.target;
  // Check to see if the button is pressed
  let pressed = !(element.getAttribute("aria-pressed") === "true");
  // Change aria-pressed to the opposite state

  DBHelper.postRestaurantFavoriteStatus(self.restaurant.id, pressed)
    .then((restaurant) => {
      element.setAttribute("aria-pressed", pressed);
    });
};
