import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateVisitForAppointment(
  supabase: SupabaseClient,
  patientId: string,
  appointmentId: string | number,
): Promise<{ visitId: string | null; error: string | null }> {
  const { data: existingVisit, error: lookupError } = await supabase
    .from("visits")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (lookupError) {
    return { visitId: null, error: lookupError.message };
  }

  if (existingVisit) {
    return { visitId: existingVisit.id, error: null };
  }

  const { data: newVisit, error: insertError } = await supabase
    .from("visits")
    .insert({
      patient_id: patientId,
      appointment_id: appointmentId,
    })
    .select("id")
    .single();

  if (!insertError && newVisit?.id) {
    return { visitId: newVisit.id, error: null };
  }

  if (insertError?.code === "23505") {
    const { data: visitAfterConflict, error: retryError } = await supabase
      .from("visits")
      .select("id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (!retryError && visitAfterConflict) {
      return { visitId: visitAfterConflict.id, error: null };
    }
  }

  return {
    visitId: null,
    error: insertError?.message ?? "Visit could not be created.",
  };
}
