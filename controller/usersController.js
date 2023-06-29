const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateRandomToken = require("../services/generateRandomToken");
const Authentication = require("../middlewares/authenticate");

const {
  users,
  bookings,
  flights,
  passengers,
  payments,
  seats,
} = require("../models");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const generateOTP = require("../services/otpGenerator");
const sendOTPByEmail = require("../services/sendEmailOtp");
const sendEmailResetPassword = require("../services/sendEmailResetPassword");

const register = catchAsync(async (req, res) => {
  try {
    const { name, password, email, phoneNumber } = req.body;

    // validation if email is already in use
    const user = await users.findOne({ where: { email: email } });
    if (user) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Email already exists!");
    }

    // validation for minimum password length
    const passwordLength = password.length >= 8;
    if (!passwordLength) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Minimum password length must be 8 characters or more"
      );
    }

    // encrypt password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // generate OTP
    const otp = generateOTP();

    // send OTP via email
    await sendOTPByEmail(email, otp); // Make sure you have implemented this function

    // register new user
    const newUser = await users.create({
      name,
      password: hashedPassword,
      email,
      phoneNumber,
      otp,
    });

    const newUserResponse = newUser.toJSON();
    delete newUserResponse.otp;

    res.status(201).json({
      status: "success",
      data: {
        newUserResponse,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        status: error.status,
        message: error.message, // Mengambil pesan error dari instance ApiError
      });
    } else {
      // Handle other types of errors
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  }
});

const login = catchAsync(async (req, res) => {
  // const { email, password, otp } = req.body;
  const { email, password } = req.body;

  // cari user berdasarkan email
  const user = await users.findOne({
    where: {
      email,
    },
  });

  // gagal melanjutkan karena username nya tidak ada
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User doesn't exist");
  }

  // check status verifikasi pengguna
  if (!user.verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User is not verified");
  }

  // check password user, jika success login dapat response intinya TOKEN
  if (user && bcrypt.compareSync(password, user.password)) {
    // generate token untuk user yang berhasil login
    const token = jwt.sign(
      {
        id: user.id,
        username: user.name,
        email: user.email,
      },
      "rahasia"
    );

    res.status(200).json({
      status: "Success",
      data: {
        username: user.name,
        email: user.email,
        token,
      },
    });
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Wrong Password");
  }
});

const generateLink = catchAsync(async (req, res) => {
  const { email } = req.body;

  // Find user by email
  const user = await users.findOne({
    where: {
      email,
    },
  });

  // If user doesn't exist
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Generate reset token
  const resetToken = generateRandomToken();

  // Set reset password token and expiration time
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
  await user.save();

  // Generate the reset password link
  // const resetPasswordLink = `c7-tiketku.up.railway.app/api/v1/user/reset-password`;
  const resetPasswordLink = `c7-tiketku.up.railway.app/api/v1/user/reset-password`;

  // Send the reset password link via email
  await sendEmailResetPassword(user.email, resetPasswordLink); // Make sure you have implemented this function

  res.status(200).json({
    status: "success",
    message: "Reset password link has been sent to your email",
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Cari user berdasarkan email
  const user = await users.findOne({
    where: {
      email,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User doesn't exist");
  }

  // Enkripsi password baru
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Update password user
  await user.update({
    password: hashedPassword,
  });

  res.status(200).json({
    status: "success",
    message: "Password has been reset",
  });
});

const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  // Cari pengguna berdasarkan alamat email
  const user = await users.findOne({ where: { email: email } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Periksa apakah OTP yang diberikan oleh pengguna sesuai dengan OTP yang digenerate sebelumnya
  if (otp != user.otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  // Setel status verifikasi pengguna menjadi true
  user.verified = true;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "OTP verification successful",
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  // Dapatkan semua pengguna dari database
  const allUsers = await users.findAll();

  res.status(200).json({
    status: "success",
    data: {
      users: allUsers,
    },
  });
});

const getUserByToken = catchAsync(async (req, res) => {
  const token = req.headers.authorization; // Get token from Authorization header
  const tokenWithoutPrefix = token.split(" ")[1];
  // Verify the token and get user ID
  const decodedToken = jwt.verify(tokenWithoutPrefix, "rahasia"); // Use the corresponding secret key
  const userId = decodedToken.id;

  // Find the user by ID
  const user = await users.findByPk(userId, {
    include: {
      model: bookings,
      attributes: ["amount", "flight_id", "order_date", "user_id"],
      include: {
        model: flights,
        attributes: ["airline_id", "departure", "arrival", "firstClass_price"],
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const updateUser = catchAsync(async (req, res) => {
  const token = req.headers.authorization; // Get token from Authorization header

  const { name, email, phoneNumber, password } = req.body; // Dapatkan data yang akan diperbarui dari body request

  // Verifikasi token dan dapatkan ID pengguna
  const tokenWithoutPrefix = token.split(" ")[1];
  // Verify the token and get user ID
  const decodedToken = jwt.verify(tokenWithoutPrefix, "rahasia"); // Use the corresponding secret key
  const userId = decodedToken.id;

  // Cari pengguna berdasarkan ID pengguna
  const user = await users.findByPk(userId);

  // Jika pengguna tidak ditemukan
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Memeriksa keabsahan pengguna yang ingin melakukan pembaruan
  // Misalnya, Anda dapat memeriksa peran pengguna atau kondisi lainnya

  // Perbarui data pengguna
  user.name = name;
  user.email = email;
  user.phoneNumber = phoneNumber;

  // Jika password ada dalam body request, hash password baru dan perbarui
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    user.password = hashedPassword;
  }

  await user.save();

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const id = req.params.id;

  const user = await users.findByPk(id);

  if (!user) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `User with this id ${id} is not found`
    );
  }

  await user.destroy({
    where: {
      id,
    },
  });

  res.status(200).json({
    status: "Success",
    message: `User dengan id ${id} terhapus`,
  });
});

module.exports = {
  register,
  login,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserByToken,
  verifyOTP,
  generateLink,
  resetPassword,
};
