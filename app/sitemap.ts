import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://pl-conferences.com", lastModified: new Date() },
    { url: "https://pl-conferences.com/about", lastModified: new Date() },
    { url: "https://pl-conferences.com/submit", lastModified: new Date() },
  ];
}
