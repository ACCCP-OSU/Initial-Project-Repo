import type { Metadata } from "next";

import "@/app/globals.css";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: `${config.appName} | Capstone MVP`,
  description: "SSO-based self-service DOCX to accessible Canvas HTML conversion platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "\"Trebuchet MS\", \"Segoe UI\", Verdana, sans-serif" }}>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
