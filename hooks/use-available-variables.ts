"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api"; // Your actual ApiClient!
import type { Variable, GlobalList } from "@/types";

export interface AvailableVariable {
  value: string;
  label: string;
  type: "global" | "list" | "output";
  description?: string;
}

export function useAvailableVariables(sequenceId?: string) {
  const [variables, setVariables] = useState<AvailableVariable[]>([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
    let isMounted = true;
    async function fetchAll() {
      setLoading(true);
      try {
        // 1. Get from backend
        const rawVars = await apiClient.getAvailableVariablesForSequence(sequenceId || "");

        // 2. Normalize to our frontend type
        const frontendVars: AvailableVariable[] = rawVars.map((v: any) => {
          // For global_list with items
          if (v.type === "global_list" && Array.isArray(v.items)) {
            return {
              value: v.name,
              label: v.name,
              type: "list",
              description: v.description,
              // Add defaultValue as array of string for global lists
              defaultValue: v.items.map((item: any) => item.value)
            };
          }
          // For any other variable type
          return {
            value: v.name,
            label: v.name,
            type: v.type === "block_output" ? "output" : v.type === "global_list" ? "list" : v.type,
            description: v.description,
            // Add defaultValue for single-value variables
            defaultValue: v.value
          };
        });

        // 3. Filter out anything with no name
        const deduped = frontendVars.filter(v => typeof v.value === "string" && !!v.value);

        if (isMounted) setVariables(deduped);
      } catch (err) {
        if (isMounted) setVariables([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [sequenceId]);

  const getVariablesByType = (type: "global" | "list" | "output") => {
    return variables.filter((v) => v.type === type);
  };

  const searchVariables = (query: string) => {
    const q = query.toLowerCase();
    return variables.filter(
      (v) =>
        v.value.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
    );
  };

  return {
    variables,
    loading,
    getVariablesByType,
    searchVariables,
  };
}
