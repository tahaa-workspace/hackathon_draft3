const ROLES = new Set(['ADMIN', 'OWNER', 'BENEFICIARY', 'LAWYER']);

export function authorize(...allowed) {
  const normalized = allowed.filter((r) => ROLES.has(r));
  if (normalized.length === 0) {
    throw new Error('authorize() must be called with at least one valid role.');
  }
  const allowedSet = new Set(normalized);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!allowedSet.has(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

export default authorize;
