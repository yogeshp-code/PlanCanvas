import { PlanUploader } from "@/components/plan-uploader"
import { GithubIcon } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src={`/logo3.png`} alt="Logo" className="h-20 w-60" />
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/yogeshp-code/PlanCanvas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <GithubIcon className="h-6 w-6" />
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Visualize Your Infrastructure Changes</h2>
            <p className="text-gray-600 mb-6">
              Upload or paste your Terraform plan output (JSON or raw text) to visualize the changes before applying
              them. Easily identify creates, updates, and destroys with color coding and filter resources by type or
              name.
            </p>
            <PlanUploader />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-600 text-sm">
          PlanCanvas by Yogesh Patil © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
