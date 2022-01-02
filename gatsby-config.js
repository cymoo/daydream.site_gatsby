module.exports = {
  siteMetadata: {
    title: `Daydream`,
    author: {
      name: "cymoo",
      description: "都是胡言乱语，别当真",
    },
    description: `Personal blog by Cymoo`,
    siteUrl: `https://daydream.site`,
  },
  plugins: [
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
        setup: options => ({
          ...options,
          custom_namespaces: {
            itunes: "https://www.itunes.com/dtds/podcast-1.0.dtd",
          },
          custom_elements: [{ "itunes:author": "Cymoo" }],
        }),
        feeds: [
          {
            serialize: ({ query: { site, allMarkdownRemark } }) => {
              return allMarkdownRemark.edges.map(edge => {
                return Object.assign({}, edge.node.frontmatter, {
                  date: edge.node.frontmatter.date,
                  url: site.siteMetadata.siteUrl + edge.node.fields.slug,
                  guid: site.siteMetadata.siteUrl + edge.node.fields.slug,
                  custom_elements: [
                    {
                      "content:encoded": edge.node.html.replace(
                        /(?<="|\s)\/static\//g,
                        `${site.siteMetadata.siteUrl}\/static\/`
                      ),
                    },
                  ],
                })
              })
            },
            query: `
              {
                allMarkdownRemark(
                  sort: { order: DESC, fields: [frontmatter___date] },
                ) {
                  edges {
                    node {
                      excerpt
                      html
                      fields { slug }
                      frontmatter {
                        title
                        date(formatString: "YYYY-MM-DD")
                        description
                        visible
                      }
                    }
                  }
                }
              }
            `,
            output: "/rss.xml",
            title: "daydream.site's RSS Feed",
          },
        ],
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/blog`,
        name: `blog`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/assets`,
        name: `assets`,
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 630,
            },
          },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-top: 1.75rem`,
            },
          },
          "gatsby-remark-autolink-headers",
          `gatsby-remark-prismjs`,
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
          {
            resolve: "gatsby-remark-external-links",
            options: {
              target: "_blank",
            },
          },
        ],
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Daydream`,
        short_name: `Daydream`,
        start_url: `/`,
        background_color: `#ffffff`,
        theme_color: `rgb(2, 158, 116)`,
        display: `minimal-ui`,
        icon: `src/assets/daydream.png`,
        theme_color_in_head: false,
      },
    },
  ],
}
