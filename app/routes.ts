import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("features", "routes/features.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("help", "routes/help.tsx"),
  route("download/:transferId", "routes/download.tsx"),
  route("account", "routes/account.tsx")
] satisfies RouteConfig;
