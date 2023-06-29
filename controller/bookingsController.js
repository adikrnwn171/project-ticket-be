const httpStatus = require("http-status");

const {
  airports,
  bookings,
  passengers,
  payments,
  flights,
  airlines,
  seats,
} = require("../models");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const createBookings = catchAsync(async (req, res) => {
  const { flight_id, order_date, amount } = req.body;

  // register user baru
  const newBookings = await bookings.create({
    user_id: req.user.id,
    flight_id,
    order_date,
    amount,
  });

  res.status(201).json({
    status: "success",
    data: {
      newBookings,
    },
  });
});

//GET ALL
const findAllBooking = catchAsync(async (req, res) => {
  const bookingsData = await bookings.findAll({
    include: [
      {
        model: passengers,
        attributes: [
          "id",
          "name",
          "born_date",
          "citizen",
          "identity_number",
          "publisher_country",
          "valid_until",
          "booking_id",
        ],
      },
      {
        model: payments, // Include tabel "payments"
        attributes: ["id", "payment_method", "payment_amount", "payment_date"],
      },
      {
        model: flights, // Include tabel "flights"
        include: [
          {
            model: airlines, // Include tabel "airlines" dalam flights
            attributes: ["airline_name", "baggage", "cabin_baggage"],
          },
          {
            model: airports,
            as: "departureAirport",
            attributes: ["airport_name", "city", "country", "imgURL"],
          },
          {
            model: airports,
            as: "arrivalAirport",
            attributes: ["airport_name", "city", "country", "imgURL"],
          },
        ],
      },
    ],
  });
  res.status(200).json({
    status: "success",
    data: {
      bookings: bookingsData,
    },
  });
});

const getBookingsById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await bookings.findByPk(id, {
      include: [
        {
          model: passengers,
          attributes: [
            "id",
            "name",
            "born_date",
            "citizen",
            "identity_number",
            "publisher_country",
            "valid_until",
            "booking_id",
          ],
        },
        {
          model: payments, // Include tabel "payments"
          attributes: [
            "id",
            "payment_method",
            "payment_amount",
            "payment_date",
          ],
        },
      ],
    });

    if (!data) {
      throw new ApiError(httpStatus.NOT_FOUND, "Passenger not found");
    }

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }
};

const getBookingsByToken = async (req, res) => {
  try {
    const token = req.headers.authorization; // Get token from Authorization header
    const tokenWithoutPrefix = token.split(" ")[1];
    // Verify the token and get user ID
    const decodedToken = jwt.verify(tokenWithoutPrefix, "rahasia"); // Use the corresponding secret key
    const userId = decodedToken.id;
    const data = await bookings.findByPk(userId, {
      include: [
        {
          model: passengers,
          attributes: [
            "id",
            "name",
            "born_date",
            "citizen",
            "identity_number",
            "publisher_country",
            "valid_until",
            "booking_id",
          ],
        },
        {
          model: payments, // Include tabel "payments"
          attributes: [
            "id",
            "payment_method",
            "payment_amount",
            "payment_date",
          ],
        },
      ],
    });

    if (!data) {
      throw new ApiError(httpStatus.NOT_FOUND, "Passenger not found");
    }

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }
};

const updateBooking = catchAsync(async (req, res) => {
  const id = req.params.id;
  const { flight_id, order_date, amount } = req.body;

  const booking = await bookings.findByPk(id);

  if (!booking) {
    throw new ApiError(404, `Booking with id ${id} is not found`);
  }

  booking.flight_id = flight_id;
  booking.order_date = order_date;
  booking.amount = amount;
  await booking.save();

  res.status(200).json({
    status: "success",
    data: {
      booking,
    },
  });
});

const deleteBooking = catchAsync(async (req, res) => {
  const id = req.params.id;

  const booking = await bookings.findByPk(id);

  if (!booking) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Airport with this id ${id} is not found`
    );
  }

  await bookings.destroy({
    where: {
      id,
    },
  });

  res.status(200).json({
    status: "Success",
    message: `Bookings dengan id ${id} terhapus`,
  });
});

module.exports = {
  createBookings,
  findAllBooking,
  getBookingsById,
  updateBooking,
  deleteBooking,
  getBookingsByToken,
};
