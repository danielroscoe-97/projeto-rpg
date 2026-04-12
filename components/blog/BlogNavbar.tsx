"use client";

import { Navbar } from "@/components/layout/Navbar";
import { BlogNavAuthSlot } from "@/components/blog/BlogNavAuthSlot";
import { BLOG_NAV_LINKS } from "@/lib/blog/blog-nav-links";

export function BlogNavbar() {
  return (
    <Navbar
      brand="Pocket DM"
      brandHref="/"
      links={BLOG_NAV_LINKS}
      rightSlot={<BlogNavAuthSlot />}
    />
  );
}
