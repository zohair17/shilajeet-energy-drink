import { Geist, Geist_Mono, Salsa } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// App-wide display font. Salsa ships a single weight (400).
const salsa = Salsa({
  weight: "400",
  variable: "--font-salsa",
  subsets: ["latin"],
});

export const metadata = {
  title: "Shilajit Energy — Premium Functional Energy Drinks",
  description:
    "Premium energy drinks crafted with Shilajit, Fulvic Acid, and Saffron. Explore five immersive flavors.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${salsa.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#12130F] text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
