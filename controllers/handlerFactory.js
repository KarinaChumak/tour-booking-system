const AppError = require('../utils/appError');
const catchAsyncError = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError(`No document was found with this id`, 404));
    }

    res.status(204).json({ status: 'success', data: null });
  });

exports.updateOne = (Model) =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      // return to stop and not proceed to the next code
      return next(new AppError(`No document was found with this id`, 404));
    }

    res.status(200).json({ status: 'success', data: { doc } });
  });

exports.createOne = (Model) =>
  catchAsyncError(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: newDoc,
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsyncError(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) {
      // return to stop and not proceed to the next code
      return next(new AppError(`No document was found with this id`, 404));
    }

    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: doc,
    });
  });

// exports.getAll = (Model) =>
//   catchAsyncError(async (req, res, next) => {
//     // To allow  nested GET reviews on tour, won't break other code
//     let filter = {};
//     if (req.params.tourId) {
//       filter = { tour: req.params.tourId };
//     }
//     const features = new APIFeatures(Model.find(filter), req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();

//     const documents = await features.query;

//     res.status(200).json({
//       status: 'success',

//       data: { documents },
//     });
//   });

exports.getAll = (Model) =>
  catchAsyncError(async (req, res, next) => {
    // To allow  nested GET reviews on tour, won't break other code
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }
    // 1) Filtering
    let queryObj = { ...req.query, ...filter };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1)B Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    queryObj = JSON.parse(queryStr);

    // 3) Sorting
    let sortBy = '-createdAt name';
    if (req.query.sort) {
      sortBy = req.query.sort.split(',').join(' ');
    }

    // 4)Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;

    const results = await Model.paginate(queryObj, {
      sort: sortBy,
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      results: results.docs.length,
      resultsTotal: results.total,
      data: results.docs,
    });
  });
