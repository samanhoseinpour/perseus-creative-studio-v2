import { serviceGroups, blogPanel, getProjectsPanel } from '@/lib/navigation';
import NavbarClient from './NavbarClient';

// Server shell: derives the mega-panel data from the (large) services and blog
// registries plus the DB-backed projects snapshot at render time, and hands it
// to the client navbar as small serialized props, so neither the registries
// nor the store enter the client bundle.
const Navbar = async () => {
  const projectsPanel = await getProjectsPanel();
  return (
    <NavbarClient
      serviceGroups={serviceGroups}
      blogPanel={blogPanel}
      projectsPanel={projectsPanel}
    />
  );
};

export default Navbar;
