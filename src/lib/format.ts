export const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatTime = (isoTime: string): string => {
  const date = new Date(isoTime);

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

export const formatDateTime = (isoTime: string | null): string => {
  if (!isoTime) {
    return '--';
  }

  const date = new Date(isoTime);
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
};
