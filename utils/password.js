import bcrypt from "bcryptjs";

const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    logError(error, req);
    throw new Error("Password hashing failed");
  }
};

const checkPasswordStrength = (password, res) => {
  if (password.length < 8) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Mật khẩu phải dài ít nhất 8 ký tự"
    );
  }

  if (!/[A-Z]/.test(password)) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Mật khẩu phải chứa ít nhất một chữ cái in hoa"
    );
  }

  if (!/[a-z]/.test(password)) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Mật khẩu phải chứa ít nhất một chữ cái thường"
    );
  }

  if (!/[0-9]/.test(password)) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Mật khẩu phải chứa ít nhất một số"
    );
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"
    );
  }

  return true;
};

export { hashPassword, checkPasswordStrength };
