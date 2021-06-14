import React from "react"
import { css } from "@emotion/css"
import { graphql, Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const NotFoundPage = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout
      location={location}
      title={siteTitle}
      className={css`
        & header {
          display: none;
        }
      `}
    >
      <SEO title="404: Not Found" />
      <div
        className={css`
          display: flex;
          justify-content: center;
        `}
      >
        <div
          className={css`
            margin-top: 100px;
            display: inline-flex;
            flex-direction: column;
          `}
        >
          <h1 style={{ fontSize: "2rem" }}>404</h1>
          <p>你想访问的页面已被删除，或不存在</p>
          <p>
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
