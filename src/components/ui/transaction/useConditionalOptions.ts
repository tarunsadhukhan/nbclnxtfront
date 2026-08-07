import React from "react";

export interface Option {
  label: string;
  value: string;
}

export interface ConditionalFilter<T> {
  condition: (context: T) => boolean;
  filter: (option: Option, context: T) => boolean;
}

/**
 * Hook to conditionally filter options based on form values or other context.
 * Useful for scenarios like filtering expense types based on indent type.
 *
 * @example
 * ```tsx
 * const expenseOptions = useConditionalOptions({
 *   allOptions: expenses.map(exp => ({ label: exp.name, value: exp.id })),
 *   context: { indentType: formValues.indent_type },
 *   filters: [
 *     {
 *       condition: (ctx) => ctx.indentType === "open",
 *       filter: (opt) => ["3", "5", "6"].includes(opt.value),
 *     },
 *   ],
 * });
 * ```
 */
export function useConditionalOptions<T extends Record<string, unknown>>(options: {
  allOptions: Option[];
  context: T;
  filters: ConditionalFilter<T>[];
}): Option[] {
  const { allOptions, context, filters } = options;

  return React.useMemo(() => {
    let filtered = allOptions;

    for (const filterConfig of filters) {
      if (filterConfig.condition(context)) {
        filtered = filtered.filter((opt) => filterConfig.filter(opt, context));
      }
    }

    return filtered;
  }, [allOptions, context, filters]);
}

export default useConditionalOptions;

