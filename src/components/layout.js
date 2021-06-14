import React from "react"
import { Link } from "gatsby"

const Layout = ({
  location,
  title,
  children,
  includeHeader = true,
  ...rest
}) => {
  const isRootPath = location.pathname === "/"
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
        <h1 style={{ marginTop: 0, fontSize: "2.3rem" }}>
          <Link
            to="/"
            style={{ textDecoration: "none", color: "var(--text-title)" }}
          >
            {title}
          </Link>
        </h1>
        <div>
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
      <header style={{ fontSize: "1.5rem" }}>
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
      {...rest}
    >
      <div
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          maxWidth: 660,
          paddingLeft: 15,
          paddingRight: 15,
          paddingTop: 30,
          paddingBottom: 45,
        }}
      >
        {includeHeader && header}
        <main>{children}</main>
      </div>
    </div>
  )
}

export default Layout
