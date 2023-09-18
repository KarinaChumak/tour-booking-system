const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoosePaginate = require('mongoose-paginate');

const storageUrl = process.env.IMAGE_STORAGE;

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please fill a valid email address'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },

  phone: {
    type: String,
  },

  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minLength: 8,
    // hide from every output
    select: false,
  },

  passwordConfirm: {
    type: String,
    required: true,
    validate: {
      // this only works on SAVE
      validator: function (el) {
        return this.password === el;
      },
      message: 'Passwords are not the same',
    },
  },

  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: String,
  passwordResetExpirationDate: Date,

  active: {
    type: Boolean,
    default: true,
  },
  isGuide: {
    type: Boolean,
  },
});

userSchema.plugin(mongoosePaginate);
// schema middleware

userSchema.pre('save', async function (next) {
  this.isGuide = this.role === 'guide' || this.role === 'lead-guide';
  next();
});

userSchema.pre('save', async function (next) {
  // in case we're updating email or other fields, then this middleware will also be triggered but we don't want to re-encrypt the password
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (this.isModified('password') || this.isNew) return next();
  // sometimes date is created just a bit after JWT, so we substract 1 sec
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Workaround to patch image paths (to store images on supabase)
userSchema.post(/find$|findById$|findOne$/, (doc) => {
  const patchImgSrc = (img) => `${storageUrl}/users/${img}`;

  if (doc?.length) {
    const newDoc = doc.map((i) =>
      Object.assign(i, {
        photo: patchImgSrc(i.photo),
      })
    );

    doc = newDoc;
  } else {
    doc.photo = patchImgSrc(doc?.photo);
  }
});

// this.password will not be available because we set select: false, therefore we need to pass userPassword explicitly
userSchema.methods.passwordIsCorrect = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (
    this.passwordChangedAt &&
    parseInt(this.passwordChangedAt.getTime() / 1000, 10) > JWTTimestamp
  ) {
    return true;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpirationDate = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
