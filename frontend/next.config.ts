import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Sortie autonome : un dossier .next/standalone qui contient juste ce qu'il
  // faut pour servir l'app, idéal pour les images Docker minces.
  output: "standalone",
};

export default nextConfig;
