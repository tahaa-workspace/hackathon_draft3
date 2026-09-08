export function requireExactRegistrationMobile(req, res, next) {
  const phone = String(req.body?.phone || '').trim();

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({
      message: 'Mobile number must contain exactly 10 digits.',
    });
  }

  next();
}

export function requireStrongRegistrationPassword(req, res, next) {
  const password = String(req.body?.password || '');

  const validLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!validLength || !hasUppercase || !hasNumber || !hasSpecial) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include at least one uppercase letter, one number, and one special character.',
    });
  }

  next();
}
