import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { AdminEditor } from '../../components/AdminEditor';
import './admin.css';

export const metadata: Metadata = {
  title: 'Управление моделью — Киомей',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <><SiteHeader /><main id="main" className="admin-page"><AdminEditor /></main><SiteFooter /></>;
}
