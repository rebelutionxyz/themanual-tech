import { ProfileHostProvider, type ProfileLinkComponent } from '@honeycomb/profile';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** PROFILE_SHARED1 — a thin adapter over react-router's Link: its `to` prop
 * type (`To`, a string | Partial<Path> union) is wider than
 * `ProfileLinkComponent`'s plain string, so it needs a wrapper rather than a
 * direct assignment. */
const ManualLink: ProfileLinkComponent = ({ to, children, ...rest }) => (
  <Link to={to} {...rest}>
    {children}
  </Link>
);

export function ManualProfileHost({ children }: { children: ReactNode }) {
  return <ProfileHostProvider Link={ManualLink}>{children}</ProfileHostProvider>;
}
