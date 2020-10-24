import React from "react"
import { Link } from "gatsby"

const Layout = ({ location, title, children }) => {
  const rootPath = `${__PATH_PREFIX__}/`
  const isRootPath = location.pathname === rootPath
  let header = null
  let footer = null

  if (isRootPath) {
    header = (
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          className="main-heading"
          style={{ paddingTop: 30, marginTop: 0, fontSize: "2.3rem" }}
        >
          <Link
            to="/"
            style={{ textDecoration: "none", color: "var(--text-title)" }}
          >
            {title}
          </Link>
        </h1>
        <div style={{ paddingTop: 30 }}>
          <Link
            to="/"
            style={{ color: "var(--color)", textDecoration: "none" }}
          >
            关于我
          </Link>
        </div>
      </header>
    )
    footer = (
      <footer
        style={{
          marginTop: 45,
          marginBottom: 30,
          display: "flex",
          justifyContent: "space-between",
          color: "inherit",
        }}
      >
        <a
          href="mailto:wakenee@hotmail.com"
          style={{ paddingRight: 10, textDecoration: "none" }}
        >
          联系我
        </a>
        <a href="/" style={{ paddingLeft: 10, textDecoration: "none" }}>
          RSS
        </a>
      </footer>
    )
  }
  // else {
  // header = (
  //   <Link className="header-link-home" to="/">
  //     {title}
  //   </Link>
  // )
  // header = null
  // }

  return (
    <div
      className="global-wrapper"
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
          maxWidth: 650,
          paddingLeft: 15,
          paddingRight: 15,
        }}
      >
        {header}
        {/*<header className="global-header">{header}</header>*/}
        <main style={{ marginBottom: 30 }}>{children}</main>
        {/*{footer}*/}
      </div>
    </div>
  )
}

export default Layout
