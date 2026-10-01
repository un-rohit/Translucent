import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Translucent Admin Console | Subscription & Device Licensing',
  description: 'Mission control dashboard for Translucent Pro subscriptions, hardware devices, and payment verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#09090c] text-white selection:bg-purple-500/30 selection:text-purple-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
