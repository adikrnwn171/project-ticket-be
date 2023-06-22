const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { admins } = require("../models");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const register = catchAsync(async (req, res) => {
  const { name, password, email } = req.body;

  // validasi jika email sudah kepake
  const user = await admins.findOne({ where: { email: email } });
  if (user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "email already exist!");
  }

  // validasi minimum password length
  const passswordLength = password.length <= 8;
  if (passswordLength) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "minimum password length must be 8 charater or more"
    );
  }

  // enkripsi password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // register user baru
  const newAdmin = await admins.create({
    name,
    password: hashedPassword,
    email,
  });

  res.status(201).json({
    status: "success",
    data: {
      newAdmin,
    },
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  // cari user berdasarkan email
  const admin = await admins.findOne({
    where: {
      email,
    },
  });

  // gagal melanjutkan karena username nya tidak ada
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "admin doesn't exist");
  }

  // check password admin, jika success login dapat response intinya TOKEN
  if (admin && bcrypt.compareSync(password, admin.password)) {
    // generate token utk admin yg success login
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

const updateAdmin = catchAsync(async (req, res) => {
  const id = req.params.id;
  const { name, email, password } = req.body; // Dapatkan data yang akan diperbarui dari body request

  // Cari pengguna berdasarkan ID
  const admin = await admins.findByPk(id);

  // Jika pengguna tidak ditemukan
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Perbarui data pengguna
  admin.name = name;
  admin.email = email;

  // Jika password ada dalam body request, hash password baru dan perbarui
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    admin.password = hashedPassword;
  }

  await admin.save();

  res.status(200).json({
    status: "success",
    data: {
      admin,
    },
  });
});

//GET ALL
const findAllAdmin = catchAsync(async (req, res) => {
  const adminsData = await admins.findAll();
  res.status(200).json({
    status: "success",
    data: {
      admins: adminsData,
    },
  });
});

// GET BY ID
const findAdminById = catchAsync(async (req, res) => {
  const id = req.params.id;
  const admin = await admins.findByPk(id);

  if (!admin) {
    throw new ApiError(404, `Admin with this id ${id} is not found`);
  }

  res.status(200).json({
    status: "success",
    data: {
      admin,
    },
  });
});

// DELETE
const deleteAdmin = catchAsync(async (req, res) => {
  const id = req.params.id;

  const admin = await admins.findByPk(id);

  if (!admin) {
    throw new ApiError(404, `Seat with this id ${id} is not found`);
  }

  await admins.destroy({
    where: {
      id,
    },
  });
  res.status(200).json({
    status: "success",
    message: `Admin dengan id ${id} terhapus`,
  });
});

module.exports = {
  register,
  login,
  updateAdmin,
  findAllAdmin,
  findAdminById,
  deleteAdmin,
};
