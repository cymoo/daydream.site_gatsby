import React from "react"
import { Link } from "gatsby"

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  const isRootPath = location.pathname === rootPath
  let header

  if (isRootPath) {
    header = (
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ paddingTop: 30, marginTop: 0, fontSize: "2.3rem" }}>
          <Link
            to="/"
            style={{ textDecoration: "none", color: "var(--text-title)" }}
          >
            {title}
          </Link>
        </h1>
        <div style={{ paddingTop: 30 }}>
          <Link
            to="/about-me"
            style={{ color: "var(--color)", textDecoration: "none" }}
          >
            关于我
          </Link>
        </div>
      </header>
    )
  } else {
    header = (
      <header style={{ marginBottom: 10, paddingTop: 30, fontSize: "1.5rem" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          {title}
        </Link>
      </header>
    )
  }

  return (
    <div
      data-is-root-path={isRootPath}
      style={{
        minHeight: "100vh",
        transition: "color 0.2s ease-out, background 0.2s ease-out",
      }}
    >
      <div
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          maxWidth: 660,
          paddingLeft: 15,
          paddingRight: 15,
        }}
      >
        {header}
        <main style={{ marginBottom: 30 }}>{children}</main>
      </div>
    </div>
  )
}

export default Layout
