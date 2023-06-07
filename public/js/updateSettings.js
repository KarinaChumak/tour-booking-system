/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

// type is either a 'password' or 'data'
export const updateSettings = async (data, type) => {
  console.log(data);
  try {
    const res = await axios({
      method: 'PATCH',
      url:
        type === 'password'
          ? 'http://127.0.0.1:3000/api/v1/users/updatePassword'
          : 'http://127.0.0.1:3000/api/v1/users/updateMe',
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
