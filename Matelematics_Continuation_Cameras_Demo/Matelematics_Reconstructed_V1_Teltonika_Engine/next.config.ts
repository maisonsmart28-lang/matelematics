import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      { protocol: "https", hostname: "www.upela.com", pathname: "/uploads/**" },
      { protocol: "https", hostname: "public.readdy.ai", pathname: "/ai/img_res/**" },
      { protocol: "https", hostname: "mauriweb.info", pathname: "/ar/sites/default/files/**" },
      { protocol: "https", hostname: "www.greentomatocars.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "www.staffbusrental.com", pathname: "/admin/image/**" },
      { protocol: "https", hostname: "image.garlway.com", pathname: "/images/faqs/**" },
    ],
  },
};

export default nextConfig;
