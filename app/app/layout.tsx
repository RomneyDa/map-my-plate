import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./theme-provider";
import "./styles.css";

export const metadata: Metadata = {
  title: "Map My Plate",
  description: "Food provenance maps for the world inside your meal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f1e6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
