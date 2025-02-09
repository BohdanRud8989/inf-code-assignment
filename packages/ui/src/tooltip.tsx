import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva } from "class-variance-authority";

import { cn } from "@inf/ui";

const tooltipVariants = cva(
  "rounded bg-gray-900 px-3 py-2 text-sm text-white shadow-md",
);

const Tooltip = ({
  children,
  content,
  className,
  ...props
}: {
  children: React.ReactNode;
  content: string;
  className?: string;
} & React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) => {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger className="cursor-default" asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(tooltipVariants(), className)}
            sideOffset={5}
            {...props}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export { Tooltip };
