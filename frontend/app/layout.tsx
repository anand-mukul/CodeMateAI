import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeMate — The Intelligent Coding Workspace',
  description: 'Instant problem solving, multi-file code completion, and zero-keystroke browser IDE integration.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-slate-100 selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
