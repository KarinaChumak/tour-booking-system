/* eslint-disable arrow-body-style */
// for better catching errors in async functions instead of multiple try-catch blocks
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
