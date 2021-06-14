import React from "react"
import { graphql, Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const NotFoundPage = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout location={location} title={siteTitle} includeHeader={false}>
      <SEO title="404: Not Found" />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            marginTop: 100,
            display: "inline-flex",
            flexDirection: "column",
          }}
        >
          <h1 style={{ fontSize: "2.3rem" }}>404</h1>
          <p style={{ fontSize: "1.3rem" }}>你想访问的页面已被删除，或不存在</p>
          <p style={{ fontSize: "1.1rem" }}>
            <Link to="/">回到首页</Link>
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default NotFoundPage

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
