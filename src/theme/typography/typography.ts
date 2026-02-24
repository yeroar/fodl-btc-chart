export type FoldTextType =
  | "header-xl" | "header-lg" | "header-md" | "header-sm" | "header-xs" | "header-xxs"
  | "body-lg" | "body-lg-bold" | "body-md" | "body-md-bold" | "body-sm" | "body-sm-bold"
  | "caption" | "caption-bold"
  | "button-lg" | "button-sm";

export const typographyStyles: Record<
  FoldTextType,
  { fontFamily: string; lineHeight?: number; fontSize: number }
> = {
  "header-xl": { fontFamily: "Geist-Regular", lineHeight: 44, fontSize: 40 },
  "header-lg": { fontFamily: "Geist-Regular", lineHeight: 36, fontSize: 32 },
  "header-md": { fontFamily: "Geist-Regular", lineHeight: 28, fontSize: 24 },
  "header-sm": { fontFamily: "Geist-Regular", lineHeight: 24, fontSize: 20 },
  "header-xs": { fontFamily: "Geist-Regular", lineHeight: 20, fontSize: 18 },
  "header-xxs": { fontFamily: "Geist-Medium", lineHeight: 18, fontSize: 16 },
  "body-lg": { fontFamily: "Geist-Regular", lineHeight: 24, fontSize: 16 },
  "body-lg-bold": { fontFamily: "Geist-Medium", lineHeight: 24, fontSize: 16 },
  "body-md": { fontFamily: "Geist-Regular", lineHeight: 20, fontSize: 14 },
  "body-md-bold": { fontFamily: "Geist-Medium", lineHeight: 20, fontSize: 14 },
  "body-sm": { fontFamily: "Geist-Regular", lineHeight: 16, fontSize: 12 },
  "body-sm-bold": { fontFamily: "Geist-Medium", lineHeight: 16, fontSize: 12 },
  caption: { fontFamily: "Geist-Regular", lineHeight: 12, fontSize: 10 },
  "caption-bold": { fontFamily: "Geist-SemiBold", lineHeight: 12, fontSize: 10 },
  "button-lg": { fontFamily: "Geist-Medium", lineHeight: 16, fontSize: 16 },
  "button-sm": { fontFamily: "Geist-Medium", lineHeight: 14, fontSize: 14 },
};
