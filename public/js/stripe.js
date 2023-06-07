/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    'pk_test_51M9VYACOowI665uNB0ajKN8b4kqMTunVIJaeczMQm0RwYLzXQdkNuQOVJzCW7jSF54jtkCXG30vm0efkvnNutO3F00paMDAsCo'
  );

  try {
    // 1) create session
    const session = await axios(`/api/v1/booking/checkout-session/${tourId}`);
    // 2)
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
