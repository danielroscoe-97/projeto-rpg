import { cn } from "@/lib/utils";
import { FIRE_GRADIENTS } from "@/lib/design/rpg-tokens";

interface FireGradientProps {
  direction?: "horizontal" | "vertical" | "radial";
  className?: string;
  children?: React.ReactNode;
  as?: "div" | "span";
}

export function FireGradient({
  direction = "horizontal",
  className,
  children,
  as: Tag = "div",
}: FireGradientProps) {
  return (
    <Tag
      className={cn(className)}
      style={{ background: FIRE_GRADIENTS[direction] }}
    >
      {children}
    </Tag>
  );
}
