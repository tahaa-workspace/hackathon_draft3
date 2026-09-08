import User from '../models/User.js';

export async function getCurrentProfile(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get current profile error:', error);
    return res.status(500).json({ message: 'Unable to load the current profile.' });
  }
}
