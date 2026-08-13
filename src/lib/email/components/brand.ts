/**
 * Literal color/font values for email HTML — email clients strip <link
 * rel="stylesheet"> imports and don't reliably support CSS custom
 * properties, so every email component uses these constants directly
 * rather than referencing globals.css's `--color-*` tokens the rest of the
 * site uses. Existing palette values are copied 1:1 from globals.css;
 * `accent` is this sprint's new brand colour (#78B7C4), used for buttons
 * and email-specific highlights alongside the existing palette.
 */
export const emailBrand = {
  accent: "#78b7c4",
  blue: "#97b4d6",
  lavender: "#e0c9e8",
  coral: "#e89898",
  mint: "#ddefe6",
  cream: "#fdfbf8",
  ink: "#4a3f42",
  inkSoft: "#8a7b7e",
  line: "#ecdfe6",
  white: "#ffffff",
} as const;

/** Web-safe fallback stack — most email clients strip @font-face/Google
 * Fonts imports, so Poppins is a best-effort (some clients like Apple Mail
 * and the Gmail app do honor a <link> import in <head>, which EmailLayout
 * includes), with a sans-serif fallback that still reads "soft/rounded". */
export const emailFontFamily =
  "'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif";
