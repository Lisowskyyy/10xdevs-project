export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  streakDays: number;
  totalEntries: number;
  totalCircles: number;
  currentStage: string;
}

/**
 * Fetches the current user's profile data from Supabase
 * @param supabase - The Supabase client instance
 * @returns UserProfile object or null if no session/user found
 */
export async function getUserProfile(supabase: any): Promise<UserProfile | null> {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      return null;
    }

    // Fetch profile data from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Return a default "Traveler" profile if no profile exists
      return {
        id: session.user.id,
        email: session.user.email || "",
        firstName: null,
        lastName: null,
        streakDays: 0,
        totalEntries: 0,
        totalCircles: 0,
        currentStage: "nigredo",
      };
    }

    // Return formatted profile data - using Polish column names
    return {
      id: profile.id,
      email: session.user.email || "",
      firstName: profile.imie,
      lastName: profile.nazwisko,
      streakDays: profile.streak_days || 0,
      totalEntries: profile.total_entries || 0,
      totalCircles: profile.total_circles || 0,
      currentStage: profile.current_stage || "nigredo",
    };
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

/**
 * Updates the current user's profile data
 * @param supabase - The Supabase client instance
 * @param updates - Object containing the fields to update
 * @returns Promise that resolves when update is complete
 */
export async function updateUserProfile(
  supabase: any,
  updates: Partial<Pick<UserProfile, "firstName" | "lastName">>
): Promise<void> {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      throw new Error("No authenticated session found");
    }

    // Prepare update object for Supabase - using Polish column names
    const updateData: any = {};
    if (updates.firstName !== undefined) {
      updateData.imie = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      updateData.nazwisko = updates.lastName;
    }

    // Update the profile
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", session.user.id);

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}