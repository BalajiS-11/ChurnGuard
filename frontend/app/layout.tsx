import "@/styles/globals.css"
import type { Metadata } from "next"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "ChurnGuard · Banking Customer Churn & Retention Intelligence",
  description: "Enterprise Banking Customer Churn Prediction, Explainability & Retention Platform."
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-text-main antialiased selection:bg-brand selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
