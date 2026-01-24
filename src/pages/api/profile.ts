import { createServerSupabaseClient } from "../../lib/supabase";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create server-side Supabase client with cookies for session access
    const supabase = createServerSupabaseClient(cookies);

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      return new Response(
        JSON.stringify({
          error: "No authenticated session found",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { firstName, lastName } = body;

    // Validate input (basic validation)
    if (firstName !== undefined && typeof firstName !== "string" && firstName !== null) {
      return new Response(
        JSON.stringify({
          error: "Invalid firstName format",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (lastName !== undefined && typeof lastName !== "string" && lastName !== null) {
      return new Response(
        JSON.stringify({
          error: "Invalid lastName format",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Prepare update object - using Polish column names
    const updateData: any = {};
    if (firstName !== undefined) {
      updateData.imie = firstName;
    }
    if (lastName !== undefined) {
      updateData.nazwisko = lastName;
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", session.user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(
        JSON.stringify({
          error: `Failed to update profile: ${updateError.message}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Profile API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};