import { cn } from "@/lib/utils";
import { getFireStepColor, TORCH_GLOW } from "@/lib/design/rpg-tokens";

interface RuneCircleProps {
  step: number;
  total: number;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const SIZES = { sm: 32, md: 48, lg: 64 } as const;
const FONT = { sm: 11, md: 14, lg: 18 } as const;

export function RuneCircle({ step, total, size = "md", active = false }: RuneCircleProps) {
  const px = SIZES[size];
  const r = px / 2 - 2;
  const c = px / 2;
  const color = getFireStepColor(step, total);

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full motion-reduce:animate-none",
        active && "animate-rune-pulse",
      )}
      style={{
        width: px,
        height: px,
        boxShadow: active ? TORCH_GLOW.medium : undefined,
      }}
    >
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="#161622" />
        <circle
          cx={c} cy={c} r={r}
          fill={`${color}12`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={0.7}
        />
        <text
          x={c}
          y={c + FONT[size] * 0.35}
          textAnchor="middle"
          fill={color}
          fontSize={FONT[size]}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
        >
          {String(step).padStart(2, "0")}
        </text>
      </svg>
    </div>
  );
}
