"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

/* ─── Context ──────────────────────────────────────────────────── */
const VariantCtx = createContext<{
  active: string;
  setActive: (v: string) => void;
}>({ active: "", setActive: () => {} });

/* ─── Provider — wraps the entire build post ───────────────────── */
export function BuildVariantProvider({
  defaultVariant,
  children,
}: {
  defaultVariant: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(defaultVariant);
  return (
    <VariantCtx.Provider value={{ active, setActive }}>
      {children}
    </VariantCtx.Provider>
  );
}

/* ─── Toggle buttons ───────────────────────────────────────────── */
export function BuildVariantToggle({
  variants,
}: {
  variants: { id: string; label: string; sub?: string }[];
}) {
  const { active, setActive } = useContext(VariantCtx);

  return (
    <div className="my-8 flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-display mb-1">
        Escolha a variante
      </p>
      <div className="flex w-full max-w-lg rounded-xl border border-gold/20 overflow-hidden bg-white/[0.02]">
        {variants.map((v) => {
          const isActive = active === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className={`
                flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200
                flex flex-col items-center gap-0.5
                ${
                  isActive
                    ? "bg-gold text-surface-primary shadow-[0_0_20px_rgba(212,168,83,0.2)]"
                    : "text-foreground/60 hover:text-foreground/80 hover:bg-white/[0.04]"
                }
              `}
            >
              <span>{v.label}</span>
              {v.sub && (
                <span
                  className={`text-[10px] font-normal ${
                    isActive ? "text-surface-primary/70" : "text-muted-foreground/50"
                  }`}
                >
                  {v.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Conditional render — shows children only for matching variant */
export function Variant({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { active } = useContext(VariantCtx);
  if (active !== id) return null;
  return <>{children}</>;
}

/* ─── Strategy box — tactical callout (like TabletopBuilds "Tech") */
export function StrategyBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-5 my-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/40 rounded-l-xl" />
      <div className="pl-3">
        <p className="text-gold font-display text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
          <span className="text-gold/60">&#9876;</span> {title}
        </p>
        <div className="text-sm text-foreground/85 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}
