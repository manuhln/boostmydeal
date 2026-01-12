// Liste des langues disponibles
export const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

/**
 * Configuration des liens et données du footer
 */

export interface FooterLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// Colonnes du footer
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Partners", href: "/partners" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "AI Monitoring", href: "/ai-monitoring" },
      { label: "Smart Integration", href: "/smart-integration" },
      { label: "Real-Time Alerts", href: "/real-time-alerts" },
      { label: "Industry Use Cases", href: "/use-cases" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "GitHub", href: "https://github.com/boostmydeal", isExternal: true },
      { label: "FAQ", href: "/faq" },
      { label: "Help Center", href: "/help" },
    ],
  },
];

// Liens sociaux
export interface SocialLink {
  name: string;
  icon: string; // On utilisera des composants SVG
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: "Facebook",
    icon: "facebook",
    href: "https://facebook.com/boostmydeal",
  },
  {
    name: "Instagram",
    icon: "instagram",
    href: "https://instagram.com/boostmydeal",
  },
  {
    name: "Twitter",
    icon: "twitter",
    href: "https://twitter.com/boostmydeal",
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    href: "https://linkedin.com/company/boostmydeal",
  },
];

// Tagline de l'entreprise
export const COMPANY_TAGLINE = "AI-Powered Surveillance That Delivers Accuracy and Real-Time Intelligence";
