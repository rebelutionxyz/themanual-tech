import { forwardRef } from 'react';
import { Link, type LinkProps, useLocation } from 'react-router-dom';

/**
 * A <Link> that opens its target as an overlay modal-route. It stashes the
 * CURRENT location as `background` in history state; the router (see App.tsx)
 * then renders the current surface from `background` PLUS the target inside a
 * <RouteModal> over it. A direct hit on the same URL (pasted link / refresh /
 * no background) renders the target as a normal full page — so every modal has
 * a shareable, bookmarkable canonical URL.
 *
 * Drop-in for <Link>: same props. Close = navigate back to the background.
 */
export const ModalLink = forwardRef<HTMLAnchorElement, LinkProps>(function ModalLink(
  { state, ...props },
  ref,
) {
  const location = useLocation();
  return (
    <Link
      ref={ref}
      state={{ ...(state as Record<string, unknown>), background: location }}
      {...props}
    />
  );
});
