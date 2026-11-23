import "./globals.css";

export const metadata = {
  title: "Orbit",
  description: "Orbit — your personal life dashboard for habits, projects, sprints, wishes, and money.",
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#D4537E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
