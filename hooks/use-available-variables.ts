"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export interface AvailableVariable {
  value: any;
  label: string;
  type: "global" | "list" | "output";
  description?: string;
  sourceType: string;
}

export function useAvailableVariables(sequenceId?: string) {
  const [variables, setVariables] = useState<AvailableVariable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchAll() {
      setLoading(true);
      try {
        if (!sequenceId) {
          setVariables([]);
          setLoading(false);
          return;
        }
        const rawVars = await apiClient.getAvailableVariablesForSequence(sequenceId);

        // Normalize and add sourceType
        const frontendVars: AvailableVariable[] = rawVars.map((v: any) => ({
          value: v.value,
          label: v.name,
          type:
            v.type === "block_output"
              ? "output"
              : v.type === "global_list"
              ? "list"
              : "global",
          description: v.description,
          sourceType: v.type, // always carry the backend value
        }));

        // remove any null or undefined values
        setVariables(frontendVars.filter((v) => v.value !== null && v.value !== undefined));


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

  const getVariablesByType = (type: "global" | "list" | "output") =>
    variables.filter((v) => v.type === type);

  const searchVariables = (query: string) => {
    const q = query.toLowerCase();
    return variables.filter(
      (v) =>
        (typeof v.value === "string" && v.value.toLowerCase().includes(q)) ||
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
