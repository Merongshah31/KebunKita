export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function ShadCard({ className = '', children, ...props }) {
  return (
    <div className={cn('shad-card', className)} {...props}>
      {children}
    </div>
  );
}

export function ShadBadge({ className = '', children, ...props }) {
  return (
    <span className={cn('shad-badge', className)} {...props}>
      {children}
    </span>
  );
}

export function ShadButton({ className = '', children, ...props }) {
  return (
    <button className={cn('shad-button', className)} {...props}>
      {children}
    </button>
  );
}
