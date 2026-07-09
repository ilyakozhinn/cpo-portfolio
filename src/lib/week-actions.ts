"use server";

import { revalidatePath } from "next/cache";
import { requireCLevel } from "@/lib/auth";
import { resetToCurrentCalendarWeek, setCurrentWeekStart } from "@/lib/queries";
import { shiftWeek } from "@/lib/week";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/people");
  revalidatePath("/status");
  revalidatePath("/priority");
  revalidatePath("/settings");
}

export async function goToPreviousWeek(currentWeek: string) {
  await requireCLevel();
  await setCurrentWeekStart(shiftWeek(currentWeek, -1));
  revalidateAll();
}

export async function goToNextWeek(currentWeek: string) {
  await requireCLevel();
  await setCurrentWeekStart(shiftWeek(currentWeek, 1));
  revalidateAll();
}

export async function goToTodayWeek() {
  await requireCLevel();
  await resetToCurrentCalendarWeek();
  revalidateAll();
}
