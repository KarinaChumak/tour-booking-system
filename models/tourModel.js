const mongoose = require('mongoose');
const validator = require('validator');
const User = require('./userModel');
const slugify = require('slugify');

const storageUrl = process.env.IMAGE_STORAGE;

const tourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have <= 40 characters'],
      minlength: [10, 'A tour name must have >= 10 characters'],
      // validate: [validator.isAlpha, 'A tour name must contain only charachers'],
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A group must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A group must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty should be easy/medium/difficult',
      },
    },
    slug: String,
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [0, 'A rating must be from 0 to 5'],
      max: [5, 'A rating must be from 0 to 5'],
      setter: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // Will only work with new document creation, not with updating
          return val < this.price;
        },
        message: 'Discount price ({VALUE})should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],

    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },

    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },

        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // For embedding guides (users) into this document
    // guides: Array,
    // For child-referencing
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// assuming that people would often sort by price, so it's efficient to index this field
// tourSchema.index({ price: 1 }); // - single index
tourSchema.index({ price: 1, ratingsAverage: -1 }); //-compound index

tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// to make virtual references to reviews on a tour without actually persisting it to a database
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
// One way to embedd documents
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// To populate all tour guides before saves
tourSchema.pre(/^find/, async function (next) {
  // this - always points to the query object
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// // Workaround to patch image paths (needed to store images on Supabase)
// tourSchema.post(/find$|findById$|findOne$/, (doc) => {
//   if (doc) {
//     const patchImgSrc = (img) => `${storageUrl}/tours/${img}`;

//     if (doc.length) {
//       const newDoc = doc.map((i) =>
//         Object.assign(i, {
//           imageCover: patchImgSrc(i.imageCover),
//           images: i.images.map((image) => patchImgSrc(image)),
//         })
//       );

//       doc = newDoc;
//     } else {
//       doc.imageCover = patchImgSrc(doc.imageCover);
//       doc.images = doc.images.map((img) => patchImgSrc(img));
//     }
//   }
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
