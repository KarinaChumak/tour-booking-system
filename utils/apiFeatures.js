/* eslint-disable node/no-unsupported-features/es-syntax */
class APIFeatures {
  constructor(query, reqQueryString) {
    this.query = query;
    this.reqQueryString = reqQueryString;
  }

  filter() {
    // 1A) Filtering
    // Creating a query copy to filter out technical params like /?page=2 (for pagination)

    const queryObj = { ...this.reqQueryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Not awaiting it to be able to chain different methods on Query object
    this.query = this.query.find(JSON.parse(queryStr));

    // to be able to chain the methods
    return this;
  }

  sort() {
    // 2) Sorting
    if (this.reqQueryString.sort) {
      const sortBy = this.reqQueryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt name');
    }
    return this;
  }

  limitFields() {
    // 3) Field limiting

    if (this.reqQueryString.fields) {
      const fieldsSelected = this.reqQueryString.fields.split(',').join(' ');
      this.query = this.query.select(fieldsSelected);
    } else {
      // delete internal mongo's __v by default
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    // 4)Pagination
    const page = this.reqQueryString.page * 1 || 1;
    const limit = this.reqQueryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
