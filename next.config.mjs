/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Photo proofs travel through a Server Action. Netlify Functions cap request bodies at 6 MB.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};
