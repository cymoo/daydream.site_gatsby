/**
 * Bio component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import Image from "gatsby-image"

const Bio = () => {
  const data = useStaticQuery(graphql`
    query BioQuery {
      avatar: file(absolutePath: { regex: "/angel.png/" }) {
        childImageSharp {
          fixed(width: 50, height: 50, quality: 95) {
            ...GatsbyImageSharpFixed
          }
        }
      }
      site {
        siteMetadata {
          author {
            name
          }
        }
      }
    }
  `)

  // Set these values by editing "siteMetadata" in gatsby-config.js
  const author = data.site.siteMetadata?.author
  const avatar = data?.avatar?.childImageSharp?.fixed

  return (
    <div style={{ marginTop: 30, display: "flex", alignItems: "center" }}>
      {avatar && (
        <Image
          fixed={avatar}
          alt={author?.name || ``}
          style={{
            marginRight: 15,
            marginBottom: 0,
            minWidth: 50,
          }}
          imgStyle={{
            borderRadius: `50%`,
          }}
        />
      )}
      <p style={{ margin: 0 }}>都是胡言乱语，别太当真</p>
    </div>
  )
}

export default Bio
