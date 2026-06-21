import { serviceGroups, blogPanel, projectsPanel } from '@/lib/navigation';
import NavbarClient from './NavbarClient';

// Server shell: derives the mega-panel data from the (large) services, blog,
// and projects registries at render time and hands it to the client navbar as
// small serialized props, so none of the registries enter the client bundle.
const Navbar = () => {
  return (
    <NavbarClient
      serviceGroups={serviceGroups}
      blogPanel={blogPanel}
      projectsPanel={projectsPanel}
    />
  );
};

export default Navbar;
