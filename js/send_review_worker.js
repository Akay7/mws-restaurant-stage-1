importScripts('dbhelper.js');

this.onmessage = (e) => {
  let waitMilliseconds = 5 * 1000;
  let sendReview = () => {
    return DBHelper.postRestaurantReview(e.data)
      .then(review => {
        postMessage(review);
      })
      .catch(() => {
        waitMilliseconds *= 1.5;
        setTimeout(sendReview, waitMilliseconds);
      })
  };
  sendReview();
};