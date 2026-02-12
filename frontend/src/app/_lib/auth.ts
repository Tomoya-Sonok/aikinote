import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { buildDefaultLocalePath } from "./locale-path";

export const requireAuth = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(buildDefaultLocalePath("/login"));
  }

  return user;
};
