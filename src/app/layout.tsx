import type { Metadata, Viewport } from 'next';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/libre-caslon-display/latin-400.css';
import '../styles.css';
import '../play.css';
import '../table.css';
import '../multiplayer/multiplayer.css';

export const metadata: Metadata = {
  title: 'Prosperity | Une nation à bâtir',
  description: 'Prosperity, une adaptation jouable en solo avec un atelier de tuiles.',
};

export const viewport: Viewport = { themeColor: '#193a35' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
