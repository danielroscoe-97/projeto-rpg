/**
 * Feature Link Registry — centralized mapping of PocketDM features → routes.
 *
 * Every blog ProdLink resolves its destination through this registry so that
 * route changes only need to happen in one place, i18n is automatic, and
 * analytics tracking (?ref=blog-{slug}) is injected for free.
 */

export type FeatureKey =
  | "combat-tracker"
  | "monster-compendium"
  | "spell-oracle"
  | "conditions"
  | "encounter-calculator"
  | "encounter-builder"
  | "soundboard"
  | "dashboard"
  | "campaigns"
  | "character-sheets"
  | "signup"
  | "classes"
  | "races"
  | "rules"
  | "dice"
  | "damage-types"
  | "actions";

interface FeatureRoute {
  /** Route for PT-BR context */
  pt: string;
  /** Route for EN context */
  en: string;
  /** Whether the feature requires authentication */
  authRequired?: boolean;
}

export const FEATURE_LINKS: Record<FeatureKey, FeatureRoute> = {
  "combat-tracker":      { pt: "/try",                    en: "/try" },
  "monster-compendium":  { pt: "/monstros",               en: "/monsters" },
  "spell-oracle":        { pt: "/magias",                 en: "/spells" },
  "conditions":          { pt: "/condicoes",              en: "/conditions" },
  "encounter-calculator":{ pt: "/calculadora-encontro",   en: "/encounter-builder" },
  "encounter-builder":   { pt: "/calculadora-encontro",   en: "/encounter-builder" },
  soundboard:            { pt: "/app/dashboard/soundboard", en: "/app/dashboard/soundboard", authRequired: true },
  dashboard:             { pt: "/app/dashboard",          en: "/app/dashboard", authRequired: true },
  campaigns:             { pt: "/app/dashboard/campaigns", en: "/app/dashboard/campaigns", authRequired: true },
  "character-sheets":    { pt: "/app/dashboard/characters", en: "/app/dashboard/characters", authRequired: true },
  signup:                { pt: "/auth/sign-up",           en: "/auth/sign-up" },
  classes:               { pt: "/classes",                en: "/classes" },
  races:                 { pt: "/racas",                  en: "/races" },
  rules:                 { pt: "/regras",                 en: "/rules" },
  dice:                  { pt: "/dados",                  en: "/dice" },
  "damage-types":        { pt: "/tipos-de-dano",          en: "/damage-types" },
  actions:               { pt: "/acoes-em-combate",       en: "/actions" },
};

/**
 * Resolve a feature key to its full href with optional blog ref tracking.
 *
 * @param feature  - key from the registry
 * @param lang     - "pt" | "en" (defaults to "pt")
 * @param blogSlug - when provided, appends ?ref=blog-{slug} for analytics
 */
export function resolveFeatureHref(
  feature: FeatureKey,
  lang: "pt" | "en" = "pt",
  blogSlug?: string,
): string {
  const route = FEATURE_LINKS[feature];
  const base = route[lang] ?? route.pt;

  if (blogSlug) {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}ref=blog-${blogSlug}`;
  }
  return base;
}

/** Category-specific CTA presets (subtle, contextual copy) */
export const CATEGORY_CTA: Record<string, { pt: { msg: string; btn: string; href: string }; en: { msg: string; btn: string; href: string } }> = {
  tutorial: {
    pt: { msg: "Pronto pra colocar em prática?", btn: "Testar o Pocket DM \u2192", href: "/try" },
    en: { msg: "Ready to try it yourself?", btn: "Try Pocket DM \u2192", href: "/try" },
  },
  guia: {
    pt: { msg: "Use essa referência direto na sua próxima sessão.", btn: "Abrir o Pocket DM \u2192", href: "/try" },
    en: { msg: "Use this reference in your next session.", btn: "Open Pocket DM \u2192", href: "/try" },
  },
  lista: {
    pt: { msg: "Explore essas opções no compêndio gratuito.", btn: "Ver Compêndio \u2192", href: "/monstros" },
    en: { msg: "Explore these options in the free compendium.", btn: "View Compendium \u2192", href: "/monsters" },
  },
  comparativo: {
    pt: { msg: "Veja na prática como funciona.", btn: "Experimentar Grátis \u2192", href: "/try" },
    en: { msg: "See how it works in practice.", btn: "Try Free \u2192", href: "/try" },
  },
  build: {
    pt: { msg: "Monte essa build com fichas prontas.", btn: "Criar Personagem \u2192", href: "/try" },
    en: { msg: "Build this character with ready sheets.", btn: "Create Character \u2192", href: "/try" },
  },
  devlog: {
    pt: { msg: "Acompanhe a evolução em tempo real.", btn: "Testar o Pocket DM \u2192", href: "/try" },
    en: { msg: "Follow the evolution in real time.", btn: "Try Pocket DM \u2192", href: "/try" },
  },
};
