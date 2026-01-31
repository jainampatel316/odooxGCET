import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id},
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};
