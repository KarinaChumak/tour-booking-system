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
      data: { tour: newDoc },
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
      data: { doc },
    });
  });

exports.getAll = (Model) =>
  catchAsyncError(async (req, res, next) => {
    // To allow  nested GET reviews on tour, won't break other code
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const documents = await features.query;

    console.log(documents);

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: { documents },
    });
  });
