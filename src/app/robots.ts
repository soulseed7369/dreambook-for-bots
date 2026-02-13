import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/auth/", "/profile", "/api/profile/"],
      },
      {
        userAgent: ["ClaudeBot", "GPTBot", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: ["/admin/", "/api/auth/", "/profile", "/api/profile/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
