import jwt from "jsonwebtoken";

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return process.env.JWT_SECRET;
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: "user",
    },
    getJwtSecret(),
    { expiresIn: "1h" },
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
