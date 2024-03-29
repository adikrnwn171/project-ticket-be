const midtransClient = require("midtrans-client");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const httpStatus = require("http-status");
const { StatusCodes } = require("http-status-codes");
const { bookings, passengers, payments, users } = require("../models");
const jwt = require("jsonwebtoken");
const generateOTP = require("../services/otpGenerator");

// Konfigurasi kredensial Midtrans

let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: "SB-Mid-server-DfPpRmhsVXM_ZvQ2IzcHYsz1",
});

const createPayment = catchAsync(async (req, res) => {
  const { order_id, gross_amount, first_name, email, phone, payment_type } =
    req.body;

  const token = req.headers.authorization; // Get token from Authorization header
  const tokenWithoutPrefix = token.split(" ")[1];
  // Verify the token and get user ID
  const decodedToken = jwt.verify(tokenWithoutPrefix, "rahasia"); // Use the corresponding secret key
  const userId = decodedToken.id;
  const user = await users.findByPk(userId);

  const booking = await bookings.findByPk(order_id);

  let parameter = {
    payment_type: payment_type,
    transaction_details: {
      order_id: booking.id,
      gross_amount: booking.amount,
    },
    credit_card: {
      secure: true,
    },
    customer_details: {
      first_name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    },
  };

  const transaction = await snap.createTransaction(parameter);
  const transactionToken = transaction.token;

  const otp = generateOTP();

  // Return the transaction token or use it as needed
  const payment = await payments.create({
    booking_id: order_id,
    payment_amount: booking.amount,
    payment_method: null,
    payment_date: null,
    payment_status: null,
    payment_code: otp,
  });

  res.status(StatusCodes.OK).json({
    url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${transactionToken}`,
    message: "succes",
    token: transactionToken,
  });
});

const handlePaymentNotification = catchAsync(async (req, res) => {
  let notification = {
    currency: req.body.currency,
    fraud_status: req.body.fraud_status,
    gross_amount: req.body.gross_amount,
    order_id: req.body.order_id,
    payment_type: req.body.payment_type,
    status_code: req.body.status_code,
    status_message: req.body.status_message,
    transaction_id: req.body.transaction_id,
    transaction_status: req.body.transaction_status,
    transaction_time: req.body.transaction_time,
    merchant_id: req.body.merchant_id,
  };

  let data = await snap.transaction.notification(notification);
  console.log(data);

  await payments.update(
    {
      payment_method: data.payment_type,
      payment_date: data.transaction_time,
      payment_status: data.transaction_status,
    },
    {
      where: {
        booking_id: data.order_id,
      },
    }
  );

  // Berikan respons OK kepada Midtrans
  res.status(200).send("OK");
});

// GET TRANSACTION STATUS
const getTransactionStatus = catchAsync(async (req, res) => {
  try {
    // Mendapatkan status transaksi dari Midtrans
    let data = await payments.findAll({
      include: { all: true, nested: true },
    });

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Gagal mendapatkan status transaksi dari Midtrans"
    );
  }
});

module.exports = {
  createPayment,
  getTransactionStatus,
  handlePaymentNotification,
};
