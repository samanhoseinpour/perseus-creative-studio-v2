import { serviceGroups, blogPanel } from '@/lib/navigation';
import NavbarClient from './NavbarClient';

// Server shell: derives the mega-panel data from the (large) services and
// blog registries at render time and hands it to the client navbar as small
// serialized props, so neither registry enters the client bundle.
const Navbar = () => {
  return <NavbarClient serviceGroups={serviceGroups} blogPanel={blogPanel} />;
};

export default Navbar;
