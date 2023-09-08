/* eslint-disable arrow-body-style */
/* eslint-disable node/no-unsupported-features/es-syntax */
const supabase = require('@supabase/supabase-js');
const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsyncError = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const supabaseUrl = 'https://vpwbntzlkfojlpwxfsnf.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY;

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('File is not an image. Please upload only images'), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

// change this function to resize and upload to supabase
exports.resizeTourImages = catchAsyncError(async (req, res, next) => {
  if (!req.files.imageCover) return next();

  // if (!req.files.imageCover || !req.files.images) return next();

  // 1) Process the cover image

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  const resizedCoverImageBuffer = await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toBuffer();
  // .toFile(`public/img/tours/${req.body.imageCover}`);

  const { error: storageCoverError } = await supabaseClient.storage
    .from('tours')
    .upload(req.body.imageCover, resizedCoverImageBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/webp',
    });

  // 2) Process all images in a loop

  if (req.files.images) {
    req.body.images = [];

    const promises = req.files.images.map(async (file, index) => {
      const filename = `tour-${req.params.id}-${Date.now()}-image-${
        index + 1
      }.jpeg`;

      const resizedImgBuffer = await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();
      // .toFile(`public/img/tours/${filename}`);

      const { error: storageImgError } = await supabaseClient.storage
        .from('tours')
        .upload(filename, resizedCoverImageBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp',
        });

      req.body.images.push(filename);
    });

    await Promise.all(promises);
  }

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.sort = '-ratingsAverage,price';
  req.query.limit = '5';
  next();
};

exports.getTourBySlug = catchAsyncError(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour found', 404));
  }

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: { tour },
  });
});

exports.getTour = factory.getOne(Tour, {
  path: 'reviews',
  select: 'review rating user',
});
exports.getAllTours = factory.getAll(Tour);
exports.createTour = factory.createOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.updateTour = factory.updateOne(Tour);

exports.getStats = catchAsyncError(async (req, res, next) => {
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gt: 4.5 } } },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $sort: { avgPrice: 1 } },
  ]);

  res.status(200).json({ status: 'success', data: { stats } });
});

exports.getMonthlyPlan = catchAsyncError(async (req, res, next) => {
  const year = req.params.year * 1;

  const stats = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $match: {
        // filtering tours of a certain year
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // to calculate how many tours start on each month of the year
    {
      $group: {
        // selecting month of the start date as the key for aggregation
        _id: { $month: '$startDates' },
        numTours: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    // adding field 'month' as now it's an aggregation key (_id)
    {
      $addFields: { month: '$_id' },
    },

    //  to hide inner -id fiels
    { $project: { _id: 0 } },

    {
      $sort: {
        numTours: -1,
      },
    },
  ]);

  res.status(200).json({ status: 'success', data: { stats } });
});

exports.getToursWithin = catchAsyncError(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  // Radius should be in radians, therefore we divide distance by earth radius
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in a format lat,lng',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { data: tours },
  });
});

exports.getDistances = catchAsyncError(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in a format lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },

        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: distances,
  });
});
