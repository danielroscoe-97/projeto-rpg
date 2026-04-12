import {
  BookOpen,
  Skull,
  Sparkles,
  HeartPulse,
  Backpack,
  GraduationCap,
  Users,
  Swords,
  Music,
  ListChecks,
  Dice5,
} from "lucide-react";

function NavLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}

function NavChildLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      {text}
    </span>
  );
}

const ic = "w-4 h-4";

export const BLOG_NAV_LINKS = [
  { href: "/blog", label: "Blog" },
  {
    label: (
      <NavLabel
        icon={<BookOpen className={ic} aria-hidden="true" />}
        text="Compêndio"
      />
    ),
    children: [
      {
        href: "/monstros",
        label: (
          <NavChildLabel
            icon={<Skull className={ic} aria-hidden="true" />}
            text="Bestiário"
          />
        ),
      },
      {
        href: "/magias",
        label: (
          <NavChildLabel
            icon={<Sparkles className={ic} aria-hidden="true" />}
            text="Magias"
          />
        ),
      },
      {
        href: "/condicoes",
        label: (
          <NavChildLabel
            icon={<HeartPulse className={ic} aria-hidden="true" />}
            text="Condições"
          />
        ),
      },
      {
        href: "/itens",
        label: (
          <NavChildLabel
            icon={<Backpack className={ic} aria-hidden="true" />}
            text="Itens"
          />
        ),
      },
      {
        href: "/classes",
        label: (
          <NavChildLabel
            icon={<GraduationCap className={ic} aria-hidden="true" />}
            text="Classes"
          />
        ),
      },
      {
        href: "/racas",
        label: (
          <NavChildLabel
            icon={<Users className={ic} aria-hidden="true" />}
            text="Raças"
          />
        ),
      },
    ],
  },
  {
    label: (
      <NavLabel
        icon={<Swords className={ic} aria-hidden="true" />}
        text="Ferramentas"
      />
    ),
    children: [
      {
        href: "/try",
        label: (
          <NavChildLabel
            icon={<Swords className={ic} aria-hidden="true" />}
            text="Combat Tracker"
          />
        ),
      },
      {
        href: "/methodology/spell-tiers",
        label: (
          <NavChildLabel
            icon={<ListChecks className={ic} aria-hidden="true" />}
            text="Spell Tier List"
          />
        ),
      },
      {
        href: "/dados",
        label: (
          <NavChildLabel
            icon={<Dice5 className={ic} aria-hidden="true" />}
            text="Dice Roller"
          />
        ),
      },
      {
        href: "/app/dashboard/soundboard",
        label: (
          <NavChildLabel
            icon={<Music className={ic} aria-hidden="true" />}
            text="Soundboard"
          />
        ),
      },
    ],
  },
  { href: "/pricing", label: "Preços" },
];
