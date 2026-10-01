import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Translucent — The Invisible AI Copilot for Windows',
  description: 'Stealth acrylic glassmorphism AI assistant with instant global hotkeys, real-time screen snip analysis, and Gemini intelligence.',
  other: {
    'darkreader-lock': 'true',
    'color-scheme': 'dark',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" content="true" />
        <meta name="color-scheme" content="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!document.querySelector('meta[name="darkreader-lock"]')){var m=document.createElement('meta');m.name='darkreader-lock';document.head.appendChild(m);}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#070709] text-white selection:bg-purple-500/30 selection:text-purple-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
