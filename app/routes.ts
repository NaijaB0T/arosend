import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("download/:transferId", "routes/download.tsx"),
  route("account", "routes/account.tsx")
] satisfies RouteConfig;
