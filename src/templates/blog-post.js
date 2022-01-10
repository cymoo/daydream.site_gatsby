import React, { useState } from "react"
import { Link, graphql } from "gatsby"
import Img from "gatsby-image"

import Layout from "../components/layout"
import SEO from "../components/seo"
import AudioPlayer from "../components/audioplayer"
import HappyBirthday from "../components/happy-birthday"

const BlogPostTemplate = ({ data, pageContext, location }) => {
  const post = data.markdownRemark
  const img = post.frontmatter.coverImage?.childImageSharp?.fluid
  const sound = post.frontmatter.sound
  const siteTitle = data.site.siteMetadata.title
  const { previous, next } = pageContext

  const [showBirthdayGreetings, setShowBirthdayGreetings] = useState(false)

  return (
    <>
      {showBirthdayGreetings && <HappyBirthday message="娜娜生日快乐，爱你" />}
      <Layout location={location} title={siteTitle}>
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
        />
        <article itemScope itemType="http://schema.org/Article">
          <header>
            {img && (
              <div style={{ marginTop: "2rem" }}>
                <Img fluid={img} />
              </div>
            )}
            <h1 itemProp="headline" style={{ marginTop: 40 }}>
              {post.frontmatter.title}
            </h1>
            {post.frontmatter.date && (
              <p style={{ marginTop: "1rem", color: "var(--color-secondary)" }}>
                {post.frontmatter.date}
              </p>
            )}
          </header>
          {sound && (
            <AudioPlayer
              src={sound}
              style={{ marginTop: 30 }}
              onAfterChange={value => {
                // 小彩蛋
                if (value === 19) {
                  setShowBirthdayGreetings(true)
                  setTimeout(() => {
                    setShowBirthdayGreetings(false)
                  }, 15000)
                }
              }}
            />
          )}
          {post.frontmatter.toc && (
            <div
              className="toc"
              dangerouslySetInnerHTML={{ __html: post.tableOfContents }}
              itemProp="articleBody"
            />
          )}
          <div
            dangerouslySetInnerHTML={{ __html: post.html }}
            itemProp="articleBody"
          />
        </article>
        <nav style={{ marginTop: 30 }}>
          <ul
            style={{
              display: `flex`,
              flexWrap: `wrap`,
              justifyContent: `space-between`,
              padding: 0,
              margin: 0,
              listStyle: `none`,
            }}
          >
            <li style={{ listStyle: "none" }}>
              {previous && (
                <Link
                  to={previous.fields.slug}
                  rel="prev"
                  style={{ textDecoration: "none" }}
                >
                  ← {previous.frontmatter.title}
                </Link>
              )}
            </li>
            <li style={{ listStyle: "none" }}>
              {next && (
                <Link
                  to={next.fields.slug}
                  rel="next"
                  style={{ textDecoration: "none" }}
                >
                  {next.frontmatter.title} →
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </Layout>
    </>
  )
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      html
      tableOfContents(maxDepth: 3)
      frontmatter {
        title
        date(formatString: "YYYY-MM-DD")
        description
        toc
        sound
        coverImage {
          name
          childImageSharp {
            fluid {
              ...GatsbyImageSharpFluid
            }
          }
        }
      }
    }
  }
`
