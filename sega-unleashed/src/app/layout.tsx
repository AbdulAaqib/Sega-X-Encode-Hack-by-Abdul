import './globals.css';
import { ReactNode } from 'react';
import { WalletProvider } from '@/context/WalletContext';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: 'SEGA Unleashed',
  description: 'Play, Battle, and Rise',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <ClientLayout>{children}</ClientLayout>
        </WalletProvider>
      </body>
    </html>
  );
}
