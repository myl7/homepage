import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";

interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

// Latin/monospace font used for the UI and OG images, plus a CJK fallback so that
// Chinese (and other CJK) titles render instead of showing tofu boxes. satori tries
// every registered font per glyph, so the CJK face only kicks in for glyphs the
// primary font lacks.
const FONT_SPECS = [
  { cssVariable: "--font-google-sans-code", name: "Google Sans Code", weight: 400, format: "truetype" },
  { cssVariable: "--font-google-sans-code", name: "Google Sans Code", weight: 700, format: "truetype" },
  { cssVariable: "--font-noto-sans-sc", name: "Noto Sans SC", weight: 400, format: "woff" },
  { cssVariable: "--font-noto-sans-sc", name: "Noto Sans SC", weight: 700, format: "woff" },
] as const;

export async function getOgFonts(url: URL): Promise<SatoriFont[]> {
  return Promise.all(
    FONT_SPECS.map(async (spec) => {
      const path = getFontPathByWeight(fontData[spec.cssVariable], spec.weight, { format: spec.format });
      if (path === undefined) {
        throw new Error(`Cannot find the font path for ${spec.name} ${spec.weight}.`);
      }
      const data = await fetch(experimental_getFontFileURL(path, url)).then((res) => res.arrayBuffer());
      return { name: spec.name, data, weight: spec.weight, style: "normal" };
    }),
  );
}
