import { useAuthContext } from "@/components/AuthContext";

export function useAuth() {
  return useAuthContext();
}
