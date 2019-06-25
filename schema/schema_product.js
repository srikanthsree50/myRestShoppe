var schema = {
  'email': {
    optional: {
      options: { checkFalsy: true } // or: [{ checkFalsy: true }]
    },
    isEmail: {
      errorMessage: 'Invalid Email'
    }
  },
  'name': { //
    optional: true, // won't validate if field is empty
    isLength: {
      options: [{ min: 2, max: 100 }],
      errorMessage: 'Must be between 2 and 10 chars long' // Error message for the validator, takes precedent over parameter message
    },
    errorMessage: 'Invalid  Name'
  },
  'mobile_no': {
    optional: {
      options: { checkFalsy: true } // or: [{ checkFalsy: true }]
    },
    isMobilePhone: {
      options: ['en-IN'],
      errorMessage: 'Invalid Phone No.'
    }
  },
  'price': {
    optional: {
      options: { checkFalsy: true } // or: [{ checkFalsy: true }]
    },
    isFloat: {
      errorMessage: 'Invalid Price Type'
    }
  }
};

module.exports = schema;
  // req.checkBody("email", "Enter a valid email address.").optional().isEmail();
  // req.checkBody("name", "Enter a name.");
  // req.checkBody("price", "Enter price.").isFloat();
  // req.checkBody("mobile_no", "Enter a valid Indian phone number.").isMobilePhone("en-IN");