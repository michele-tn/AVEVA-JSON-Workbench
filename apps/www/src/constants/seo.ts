import type { DefaultSeoProps } from "next-seo/pages";

export const SEO: DefaultSeoProps = {
  title: "AVEVA JSON Workbench",
  description:
    "Normalize AVEVA Wonderware JSON and explore it with an interactive graph, tree, and editor.",
  themeColor: "#101c33",
  additionalLinkTags: [
    {
      rel: "manifest",
      href: "/manifest.json",
    },
    {
      rel: "icon",
      href: "/favicon.ico",
      sizes: "48x48",
    },
  ],
};
