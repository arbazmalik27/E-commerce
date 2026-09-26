import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0E8] text-[#1F211C] antialiased selection:bg-[#34452F]/15 selection:text-[#1F211C]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#34452F] focus:text-[#FFFDF8] focus:font-semibold focus:text-xs focus:uppercase focus:tracking-wider focus:rounded-full focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#A65332]"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default RootLayout
