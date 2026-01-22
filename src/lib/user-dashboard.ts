// Check if user is logged in
export const checkAuth = async () => {
  try {
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      window.location.href = "/login";
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in - redirect to login
      window.location.href = "/login";
      return;
    }

    // Update welcome message with user's email or display name
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
      const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Seeker";
      userNameEl.textContent = displayName;
    }

    // Setup logout button
    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    });
  } catch {
    // Handle auth check failure silently and redirect to login
    window.location.href = "/login";
  }
};
