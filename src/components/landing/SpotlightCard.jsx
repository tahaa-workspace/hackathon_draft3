export default function SpotlightCard({ children, className = "" }) {
  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    event.currentTarget.style.setProperty(
      "--spot-x",
      `${event.clientX - rect.left}px`
    );

    event.currentTarget.style.setProperty(
      "--spot-y",
      `${event.clientY - rect.top}px`
    );
  };

  return (
    <div
      onMouseMove={handleMove}
      className={`landing-spotlight-card ${className}`}
    >
      {children}
    </div>
  );
}
