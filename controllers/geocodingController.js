const catchAsyncError = require('../utils/catchAsync');

exports.getPlaceDetails = catchAsyncError(async (req, res, next) => {
  const { placeId } = req.params;

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${process.env.GOOGLE_API_KEY}`; // site that doesn’t send Access-Control-*

  const response = await fetch(url);

  const data = await response.json();

  res.status(200).json({
    status: 'success',
    data,
  });
});
