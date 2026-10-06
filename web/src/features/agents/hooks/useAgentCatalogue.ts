import type { AgentCatalogue } from "@api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";

/** The live catalogue agents read: prices, network and the schemes on offer right now. */
export function useAgentCatalogue() {
  return useQuery({
    queryKey: ["agent-catalogue"],
    queryFn: () => api.get<AgentCatalogue>("/api/agent"),
  });
}
