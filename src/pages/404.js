import React from "react"
import { graphql, Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const NotFoundPage = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="404: Not Found" />
      <div>
        <h1
          style={{
            marginTop: 0,
            paddingTop: "5rem",
            textAlign: "center",
            fontSize: "2rem",
          }}
        >
          该页面不存在
        </h1>
        <p style={{ textAlign: "center", fontSize: "1.3rem" }}>
          <Link to="/" style={{ color: "var(--color)" }}>
            回到首页
          </Link>
        </p>
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
