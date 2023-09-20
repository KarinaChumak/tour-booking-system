/* eslint-disable arrow-body-style */
/* eslint-disable import/no-useless-path-segments */
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppError = require('./../utils/appError');
const catchAsyncError = require('../utils/catchAsync');
const Email = require('../utils/email');

const signToken = (id) =>
  promisify(jwt.sign)({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const verifyToken = (token) =>
  promisify(jwt.verify)(token, process.env.JWT_SECRET);

const createSendToken = async (user, statusCode, req, res) => {
  const token = await signToken(user._id);
  const cookieOptions = {
    expiresIn: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // to hide from response
  user.password = undefined;

  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

exports.signup = catchAsyncError(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  const url = `${req.protocol}://${req.get('host')}/mez`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) Check if email and password exists

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists & password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.passwordIsCorrect(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3) If everything ok, send token to the client

  createSendToken(user, 201, req, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsyncError(async (req, res, next) => {
  // 1) Getting token and checking if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access', 401)
    );
  }
  // 2) Verification of the token

  const decoded = await verifyToken(token);

  // 3) Check if user still exists
  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    return next(new AppError('User with this token no longer exists.', 401));
  }
  // 4) Check if user changes password after the token was issued

  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Token is expired, because user password was changed', 401)
    );
  }

  req.user = freshUser;
  res.locals.user = freshUser;

  next();
});

// Only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) Verify token
    try {
      const decoded = await verifyToken(req.cookies.jwt);

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }
      // 3) Check if user changes password after the token was issued

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged-in user
      res.locals.user = currentUser; //will make variable user accessable from pug templates
      return next();
    } catch (err) {
      return next();
    }
  }

  next();
};

// wrapper function that returns a middleware function in order to pass arguments to it
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  // 1)Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new AppError('There is no user with provided email address', 404)
    );
  }
  // 2) Generate a random reset token

  const resetToken = user.createPasswordResetToken();
  // before we modified a token but never saved the document
  await user.save({ validateBeforeSave: false });

  // 3) Send the token back as an email

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURL).sendResetPassword();
    res.status(200).json({ status: 'success', message: 'Token sent to email' });
  } catch (err) {
    user.passordResetToken = undefined;
    user.passwordResetExpired = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending an email. Try again later', 500)
    );
  }
});

exports.resetPassword = catchAsyncError(async (req, res, next) => {
  // 1) Get user based on the token

  const encryptedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: encryptedToken,
    passwordResetExpirationDate: { $gt: Date.now() },
  });

  // 2) Set new password if a token hasn't expired and there's a user, set a new password

  if (!user) {
    user.passordResetToken = undefined;
    user.passwordResetExpirationDate = undefined;
    return next(new AppError('The reset token is incorrect or expired', 400));
  }
  // 3) Update passwordAt property for the user

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passordResetToken = undefined;
  user.passwordResetExpirationDate = undefined;

  await user.save();

  // 4) Log the user in, send JWT

  createSendToken(user, 201, req, res);
});

exports.updatePassword = catchAsyncError(async (req, res, next) => {
  // 1) Get user from db
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if the posted password is correct

  if (
    !user ||
    !(await user.passwordIsCorrect(req.body.passwordOld, user.password))
  ) {
    return next(new AppError('Provided old password is incorrect', 401));
  }
  // 3) If it's correct, update a password

  user.password = req.body.passwordNew;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  // 4) Log user in
  createSendToken(user, 200, req, res);
});
