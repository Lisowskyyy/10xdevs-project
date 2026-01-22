import { defineMiddleware } from "astro:middleware";
import { createServerSupabaseClient } from "./lib/supabase";

// Protected routes that require authentication
const protectedRoutes = ["/dashboard", "/profile", "/journal"];

export const onRequest = defineMiddleware(async ({ cookies, url, redirect }, next) => {
  const supabase = createServerSupabaseClient(cookies);

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) => url.pathname.startsWith(route));

  if (isProtectedRoute) {
    // Get the session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // If no session, redirect to login
    if (!session || error) {
      return redirect("/login");
    }
  }

  // If user is logged in and tries to access login/signup, redirect to dashboard
  if (url.pathname === "/login" || url.pathname === "/signup") {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      return redirect("/dashboard");
    }
  }

  return next();
});
