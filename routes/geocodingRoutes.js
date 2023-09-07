const express = require('express');
const geocodingController = require('../controllers/geocodingController');

const router = express.Router();

// Accepts Google placeID as param
router.use('/details/:placeId', geocodingController.getPlaceDetails);

module.exports = router;
