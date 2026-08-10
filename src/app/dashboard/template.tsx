import * as React from 'react';

/** Remounts on admin route changes — soft fade without touching chrome. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="kutagjej-fade">{children}</div>;
}
