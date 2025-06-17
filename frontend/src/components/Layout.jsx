import Navigation from "./Navigation"

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navigation />
      <main className="relative">{children}</main>
    </div>
  )
}

export default Layout
