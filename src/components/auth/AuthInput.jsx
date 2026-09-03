export default function AuthInput({
  id,
  label,
  icon: Icon,
  ...inputProps
}) {
  return (
    <div>

      <label
        htmlFor={id}
        className="auth-field-label"
      >
        {label}
      </label>

      <div className="auth-input-wrapper">

        {Icon && (
          <Icon
            size={17}
            className="auth-input-icon"
          />
        )}

        <input
          id={id}
          className={`auth-input ${
            Icon ? "auth-input-with-icon" : ""
          }`}
          {...inputProps}
        />

      </div>

    </div>
  );
}