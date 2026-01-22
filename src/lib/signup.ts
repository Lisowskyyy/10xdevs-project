// Signup form handling
export function initSignupForm() {
  const form = document.getElementById("signupForm") as HTMLFormElement;
  const displayNameInput = document.getElementById("displayName") as HTMLInputElement;
  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const confirmPasswordInput = document.getElementById("confirmPassword") as HTMLInputElement;

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = displayNameInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";
    const password = passwordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";

    // Validation
    if (!email || !password || !confirmPassword) {
      alert("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");

      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        alert("Configuration error. Please contact support.");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split("@")[0],
          },
        },
      });

      if (error) {
        alert(`Signup failed: ${error.message}`);
        return;
      }

      if (data.user) {
        // Success! Redirect to dashboard
        alert("Account created! Welcome to VERANIMA 🔥");
        window.location.href = "/user";
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Signup error:", err);
      alert("An unexpected error occurred. Please try again.");
    }
  });
}
