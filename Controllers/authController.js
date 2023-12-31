import User from "../Models/userModel.js";
import { catchAsync } from "../Utils/catchAsnc.js";
import { appError } from "../Utils/appError.js";
import jwt from "jsonwebtoken";

// const signToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT);
// };
// // sign up
// export const signUp = catchAsync(async (req, res, next) => {
//   const newUser = await User.create({
//     name: req.body.name,
//     mobileNo: req.body.mobileNo,
//     email: req.body.email,
//     password: req.body.password,
//   });
//   const Token = signToken(newUser._id);

//   res.status(201).json({
//     status: "success",
//     data: { newUser },
//     Token,
//   });
// });
// //SignIn
// export const signIn = catchAsync(async (req, res, next) => {
//   const { email, mobileNo, password } = req.body;

//   if (!password && (!mobileNo || email)) {
//     return next(
//       appError("Please provide email or mobile number and password!", 400)
//     );
//   }
//   // 2) Check if user exists && password is correct
//   const user = await User.findOne({ $or: [{ email }, { mobileNo }] }).select(
//     "+password"
//   );

//   if (!user || !(await user.correctPassword(password, user.password))) {
//     return next(appError("Incorrect email or password", 401));
//   }

//   // 3) If everything ok, send token to client
//   const Token = signToken(user._id);
//   res.status(200).json({ status: "success", Token });
// });

// export const verifyToken = catchAsync(async (req, res, next) => {
//   let Token;
  
// });

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT, {
    expiresIn:"60d"
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

export const signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    mobileNo: req.body.mobileNo,
 
  });

  createSendToken(newUser, 201, res);
});

export const signIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new appError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new appError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new appError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new appError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new appError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(req.User.role);
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
     
      return next(
        new appError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};
