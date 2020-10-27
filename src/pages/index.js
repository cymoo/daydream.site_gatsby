import React from "react"
import { Link, graphql } from "gatsby"

import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"

const BlogIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title
  const posts = data.allMarkdownRemark.nodes.filter(
    node => node.frontmatter.visible !== false
  )

  if (posts.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <SEO title="Home" />
        <Bio />
        <p>空空如也</p>
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="Home" />
      <Bio />
      <ol style={{ marginLeft: 0, listStyle: `none` }}>
        {posts.map(post => {
          const title = post.frontmatter.title || post.fields.slug

          return (
            <li key={post.fields.slug} style={{ marginTop: "3rem" }}>
              <article
                className="post-list-item"
                itemScope
                itemType="http://schema.org/Article"
              >
                <header>
                  <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                    <Link
                      to={post.fields.slug}
                      itemProp="url"
                      style={{ textDecoration: "none" }}
                    >
                      <span
                        itemProp="headline"
                        style={{ color: "var(--text-title)" }}
                      >
                        {title}
                      </span>
                    </Link>
                  </h2>
                  <small style={{ color: "var(--color-secondary)" }}>
                    {post.frontmatter.date}
                  </small>
                </header>
                <p
                  dangerouslySetInnerHTML={{
                    __html: post.frontmatter.description || post.excerpt,
                  }}
                  itemProp="description"
                  style={{ marginTop: "0.5rem" }}
                />
              </article>
            </li>
          )
        })}
      </ol>
    </Layout>
  )
}

export default BlogIndex

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      nodes {
        excerpt
        fields {
          slug
        }
        frontmatter {
          date(formatString: "YYYY-MM-DD")
          title
          description
          visible
        }
      }
    }
  }
`
