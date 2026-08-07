declare module "@/components/ui/tooltip" {
  import React from "react";

  interface TooltipProps {
    content: string;
    children: React.ReactNode;
  }

  const Tooltip: React.FC<TooltipProps>;

  export default Tooltip;
}
