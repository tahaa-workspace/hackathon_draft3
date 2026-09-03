import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Authentication required. Provide a valid Bearer token.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select('role status')
      .lean();

    if (!user) {
      return res.status(401).json({
        message: 'This account no longer exists.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        message:
          user.status === 'SUSPENDED'
            ? 'This account has been suspended by an administrator.'
            : 'This account is not active.',
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    return next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Invalid or expired authentication token.',
      });
    }

    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      message: 'Unable to validate authentication right now.',
    });
  }
}

export default protect;
