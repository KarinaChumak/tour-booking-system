const mongoose = require('mongoose');
const Tour = require('./tourModel');
const mongoosePaginate = require('mongoose-paginate');

const bookingSchema = mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!'],
  },
  price: {
    type: Number,
    require: [true, 'Booking must have a price'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookingSchema.plugin(mongoosePaginate);
bookingSchema.statics.updateBookedInfo = async function (tourId) {
  await Tour.findByIdAndUpdate(tourId, { $inc: { numPeopleBooked: 1 } });
};

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });

  next();
});

bookingSchema.post('save', function () {
  this.constructor.updateBookedInfo(this.tour);
});

bookingSchema.virtual('tourObj', {
  ref: 'Tour',
  foreignField: '_id',
  localField: 'tour',
  justOne: true,
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
