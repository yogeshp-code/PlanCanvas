import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { icons } from "lucide-react"

export const metadata = {
  title: "PlanCanvas by Yogesh Patil",
  icons: {
    icon: "/background.jpeg",  // Add a logo or thumbnail image if available
    shortcut: "/background.jpeg",  // Add a logo or thumbnail image if available
  },
  description: "Visualize Terraform Plans and Simplify Your Workflow",
  generator: 'Yogesh Patil',
  author: "Yogesh Patil",
  keywords: "Terraform, Plan, Visualization, DevOps, Infrastructure as Code, Automation, Cloud",
  url: "https://plan-canvas.vercel.app/",
  image: "/logo3.png",  // Add a logo or thumbnail image if available
  ogTitle: "PlanCanvas: Visualize Terraform Plans with Ease",
  ogDescription: "A simple tool to visualize your Terraform plans and see resource changes more clearly.",
  ogImage: "/public/logo3.png"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
