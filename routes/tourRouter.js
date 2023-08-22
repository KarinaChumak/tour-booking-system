const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRouter');

const router = express.Router();

// TODO: change to slug instead of ID
router.use('/:tourId/reviews', reviewRouter);

router.route('/tour/:slug').get(tourController.getTourBySlug);

router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(
    // authController.protect,
    tourController.getAllTours
  )
  .post(
    // authController.protect,
    // authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .delete(
    // authController.protect,
    // authController.restrictTo('admin', 'lead-guide'),

    tourController.deleteTour
  )
  .patch(
    // authController.protect,
    // authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  );

module.exports = router;
