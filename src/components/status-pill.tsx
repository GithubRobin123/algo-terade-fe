interface StatusPillProps {
  label: string;
  tone: 'success' | 'warning' | 'neutral' | 'danger' | 'info';
}

export const StatusPill = ({ label, tone }: StatusPillProps) => {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
};
