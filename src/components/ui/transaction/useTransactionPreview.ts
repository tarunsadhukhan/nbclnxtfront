import React from "react";
import type { TransactionMetadataItem } from "../TransactionWrapper";

export type PreviewField<THeader> = {
  label: string;
  accessor: (header: THeader) => React.ReactNode;
  includeWhen?: (header: THeader) => boolean;
};

export type UseTransactionPreviewOptions<THeader> = {
  header: THeader;
  fields: PreviewField<THeader>[];
};

export function useTransactionPreview<THeader>({ header, fields }: UseTransactionPreviewOptions<THeader>) {
  const metadata = React.useMemo<TransactionMetadataItem[]>(() => {
    return fields
      .filter((field) => (field.includeWhen ? field.includeWhen(header) : true))
      .map((field) => ({ label: field.label, value: field.accessor(header) }));
  }, [fields, header]);

  return { metadata };
}

export default useTransactionPreview;
