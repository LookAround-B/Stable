import React, { forwardRef } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';

/**
 * NavLink — Active-aware link component (React Router adaptation of EFM's Next.js NavLink).
 * Uses React Router's NavLink under the hood, with className merging for active state.
 */
const NavLink = forwardRef(({ className, activeClassName, to, children, ...props }, ref) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <RouterNavLink
      ref={ref}
      to={to}
      className={[className, isActive ? activeClassName : ''].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </RouterNavLink>
  );
});

NavLink.displayName = 'NavLink';

export { NavLink };
export default NavLink;
