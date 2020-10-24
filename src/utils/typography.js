import "../global.css"

import Typography from "typography"
import Parnassus from "typography-theme-parnassus"

Parnassus.overrideThemeStyles = () => ({
  a: {
    color: "var(--text-link)",
    boxShadow: "none",
  },
  "a:hover, a:active": {
    textDecoration: "underline",
  },
})

delete Parnassus.googleFonts

const typography = new Typography(Parnassus)

// Hot reload typography in development.
if (process.env.NODE_ENV !== "production") {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
