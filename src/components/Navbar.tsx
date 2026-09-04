import { serviceGroups, getBlogPanel, getProjectsPanel } from '@/lib/navigation';
import NavbarClient from './NavbarClient';

const Navbar = async () => {
  const [projectsPanel, blogPanel] = await Promise.all([getProjectsPanel(), getBlogPanel()]);
  return <NavbarClient serviceGroups={serviceGroups} blogPanel={blogPanel} projectsPanel={projectsPanel} />;
};

export default Navbar;
