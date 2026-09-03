export default function ProfileInfoCard({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="profile-card">

      <div className="profile-card-header">

        {eyebrow && (
          <p className="profile-card-eyebrow">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-2 text-lg font-semibold text-ink-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-500">
            {description}
          </p>
        )}

      </div>


      <div className="profile-card-body">
        {children}
      </div>

    </section>
  );
}