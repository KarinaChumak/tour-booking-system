// eslint-disable-next-line import/no-extraneous-dependencies
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/appError');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');

const Booking = require('../models/bookingModel');
const catchAsyncError = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsyncError(async (req, res, next) => {
  // 1) Get the currently booked tour

  const tour = await Tour.findById(req.params.tourId);

  // 2) Create a checkout session
  // const product = await stripe.products.create({
  //   name: `${tour.name} Tour`,
  //   description: tour.summary,
  //   images: [`https://www.natours.dev/img/tours/${tour.image}`],
  // });

  // const priceObj = await stripe.prices.create({
  //   unit_amount: tour.price * 100,
  //   currency: 'usd',
  //   product: product.id,
  // });

  // const session = await stripe.checkout.sessions.create({
  //   payment_method_types: ['card'],
  //   success_url: `${req.protocol}://${req.get('host')}/`,
  //   cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
  //   customer_email: req.user.email,
  //   client_reference_id: req.params.tourId,
  //   line_items: [
  //     {
  //       price: priceObj.id,
  //       quantity: 1,
  //     },
  //   ],
  //   mode: 'payment',
  // });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${tour._id}&user=${
    //   req.user._id
    // }&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          unit_amount: tour.price * 100,
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.image}`,
            ],
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });
  // 3) Send session as a response

  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsyncError(async (session) => {
  const user = (await User.findOne({ email: session.customer_email })).id;
  const tour = session.client_reference_id;
  const price = session.amount_total / 100;

  await Booking.create({ tour, user, price });
});

exports.webhookCheckout = catchAsyncError(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_ENDPOINT_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await this.createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
});

// exports.createBookingCheckout = catchAsyncError(async (req, res, next) => {
//   const { tour, user, price } = req.query;

//   if (!tour && !user && !price) return next();

//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);

//   next();
// });

exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.createBooking = factory.createOne(Booking);
