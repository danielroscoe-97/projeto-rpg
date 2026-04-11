"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Locale = "en" | "pt-BR";

interface NavGroup {
  label: string;
  links: { label: string; href: string }[];
}

function getGroups(locale: Locale): NavGroup[] {
  const isPt = locale === "pt-BR";
  return [
    {
      label: isPt ? "Referência" : "Reference",
      links: [
        { label: isPt ? "Monstros" : "Monsters", href: isPt ? "/monstros" : "/monsters" },
        { label: isPt ? "Magias" : "Spells", href: isPt ? "/magias" : "/spells" },
        { label: isPt ? "Condições" : "Conditions", href: isPt ? "/condicoes" : "/conditions" },
        { label: isPt ? "Itens" : "Items", href: isPt ? "/itens" : "/items" },
      ],
    },
    {
      label: isPt ? "Jogador" : "Player",
      links: [
        { label: "Classes", href: isPt ? "/classes-pt" : "/classes" },
        { label: isPt ? "Raças" : "Races", href: isPt ? "/racas" : "/races" },
        { label: isPt ? "Talentos" : "Feats", href: isPt ? "/talentos" : "/feats" },
        { label: isPt ? "Antecedentes" : "Backgrounds", href: isPt ? "/antecedentes" : "/backgrounds" },
      ],
    },
    {
      label: isPt ? "Ferramentas" : "Tools",
      links: [
        { label: isPt ? "Dados" : "Dice", href: isPt ? "/dados" : "/dice" },
        { label: isPt ? "Regras" : "Rules", href: isPt ? "/regras" : "/rules" },
        { label: "Combat Tracker", href: "/try" },
      ],
    },
  ];
}

interface PublicDesktopNavProps {
  locale: Locale;
}

export function PublicDesktopNav({ locale }: PublicDesktopNavProps) {
  const pathname = usePathname();
  const groups = getGroups(locale);

  return (
    <div className="hidden lg:flex items-center gap-1 shrink-0">
      {groups.map((group) => {
        const isActive = group.links.some((link) => pathname === link.href || pathname.startsWith(link.href + "/"));
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger asChild>
              <button
                className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-[250ms] min-h-[44px] inline-flex items-center gap-1 ${
                  isActive
                    ? "text-gold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]"
                }`}
              >
                {group.label}
                <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-gray-950 border-white/10 shadow-xl"
            >
              {group.links.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2 ${
                      pathname === link.href || pathname.startsWith(link.href + "/")
                        ? "text-gold"
                        : "text-gray-300 hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
