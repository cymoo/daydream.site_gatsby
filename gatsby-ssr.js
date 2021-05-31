const React = require("react")

// NOTE: Google analytics is better but the service is unavailable in China.
/*
exports.onRenderBody = ({ setHeadComponents }) => {
  if (process.env.NODE_ENV === "production") {
    setHeadComponents([
      <script
        key="baidu-analytics-script"
        dangerouslySetInnerHTML={{
          __html: `
          var _hmt = _hmt || [];
          (function() {
            var hm = document.createElement("script");
            hm.src = "https://hm.baidu.com/hm.js?b88d1fbf9df07f57aba61feb1728a9f9";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
            })();
          `,
        }}
      />,
    ])
  }
}
 */
