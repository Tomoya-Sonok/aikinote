import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/personal/",
          "/*/settings/",
          "/*/social/",
          "/*/mypage",
          "/*/login",
          "/*/signup",
          "/*/forgot-password",
          "/*/reset-password",
          "/*/verify-email",
          "/*/confirm-email-change",
          "/*/error",
        ],
      },
    ],
  };
}
