// Professional SVG icons for IshiFi - replaces all emoji with clean icons

export default function Icon({ name, size = 24, className = "" }) {
  const iconMap = {
    dashboard: `<rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />`,
    home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />`,
    transactions: `<path d="M6 9h12M6 15h12M6 21h12M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />`,
    budgets: `<path d="M12 2v7m0 4v9M2 12h20" /><circle cx="12" cy="12" r="10" />`,
    analytics: `<polyline points="23 6 13 16 8 11 1 18" /><polyline points="17 6 23 6 23 12" />`,
    insights: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />`,
    advanced: `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />`,
    goals: `<circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />`,
    categories: `<rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />`,
    subscriptions: `<rect x="3" y="3" width="18" height="18" rx="2" /><line x1="16" y1="1" x2="16" y2="23" /><line x1="8" y1="1" x2="8" y2="23" /><line x1="1" y1="16" x2="23" y2="16" /><line x1="1" y1="8" x2="23" y2="8" />`,
    profile: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />`,
    settings: `<circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m6.08 0l4.24-4.24M1 12h6m6 0h6m-1.78 7.78l-4.24-4.24m-6.08 0l-4.24 4.24" />`,
    logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />`,
    chevron: `<polyline points="15 18 9 12 15 6" />`,
    collapse: `<polyline points="15 18 9 12 15 6" />`,
    add: `<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />`,
    refresh: `<polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />`,
    delete: `<polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />`,
    edit: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />`,
    upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />`,
    alert: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
    info: `<circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />`,
    check: `<polyline points="20 6 9 17 4 12" />`,
    close: `<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />`,
    phone: `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />`,
    backup: `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />`,
    food: `<path d="M21 12c0-1.657.895-3.102 2.23-3.885A2 2 0 0 0 21 7c-1.105 0-2 .895-2 2h-3V6c0-1.105-.895-2-2-2s-2 .895-2 2v3H9c0-1.105-.895-2-2-2s-2 .895-2 2c1.335.783 2.23 2.228 2.23 3.885M3 12a9 9 0 0 1 18 0m-6-6h6v9" />`,
    travel: `<path d="M6 9l6-6 6 6M12 3v10M7 16h10a2 2 0 0 1 2 2v4H5v-4a2 2 0 0 1 2-2z" />`,
    shopping: `<path d="M9 2L6.12 6.81M9 2h6M9 2L12 6.81M4 9h16L17.35 18.1A2 2 0 0 1 15.45 19H8.55a2 2 0 0 1-1.9-1.9L4 9M9 13h6" />`,
    home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />`,
    bulb: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />`,
    health: `<path d="M12 9v6m3-3H9m11.939-8.939A3.94 3.94 0 0 0 16.939 2H7.061A3.94 3.94 0 0 0 3.061.061A3.94 3.94 0 0 0 2 4.061v15.878A3.94 3.94 0 0 0 3.061 23.939A3.94 3.94 0 0 0 7.061 22h9.878a3.94 3.94 0 0 0 3.939-3.939A3.94 3.94 0 0 0 22 12v-7.939a3.94 3.94 0 0 0-1.061-2.939z" />`,
    trending: `<polyline points="23 6 13 16 8 11 1 18" /><polyline points="17 6 23 6 23 12" />`,
    briefcase: `<rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 3v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V3" />`,
    sparkles: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />`,
  };

  const pathData = iconMap[name];
  if (!pathData) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      dangerouslySetInnerHTML={{ __html: pathData }}
    />
  );
}
