const Tour = require('../models/tourModel');
const catchAsyncError = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Booking = require('../models/bookingModel');

exports.getOverview = catchAsyncError(async (req, res) => {
  const tours = await Tour.find();
  // 1) get all the tour data from collection
  // 2) Build template
  //
  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

exports.getTour = catchAsyncError(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour found', 404));
  }

  res
    .status(200)
    .set(
      'Content-Security-Policy',
      'connect-src https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com'
    )
    .render('tour', {
      title: `${tour.name} tour`,
      tour,
    });
});

exports.getLoginForm = (req, res) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "connect-src 'self' https://cdnjs.cloudflare.com"
    )
    .render('login', {
      title: 'Log into your account',
    });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsyncError(async (req, res, next) => {
  // 1) Find all bookings

  const bookings = await Booking.find({ user: req.user.id }).populate(
    'tourObj'
  );

  // 2) Find all tours manually

  // const tourIDS = bookings.map((el) => el.tour);

  // const tours = await Tour.find({ _id: { $in: tourIDS } });

  // 3) Find all tours with virtual populate in mongoose

  const tours = bookings.map((booking) => booking.tourObj);
  res.status(200).render('overview', {
    title: 'My tours',
    tours,
  });
});
