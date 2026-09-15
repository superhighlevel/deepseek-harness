/** Ambient declaration for CSS Modules imported by this package's client half. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
