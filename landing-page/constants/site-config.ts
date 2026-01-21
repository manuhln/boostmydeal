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
  href?: string; // Optionnel maintenant
  isExternal?: boolean;
  description?: string; // Contenu de l'accordion
  content?: React.ReactNode; // Pour des contenus complexes (formulaires)
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
      {
        label: "About Us",
        description:
          "BoostMyDeal is an AI-powered revenue execution platform built on VoxSun’s telecom infrastructure, enabling businesses to capture, qualify, and convert more demand without increasing headcount.\n\n" +
          "By combining intelligent automation, real-time decisioning, and carrier-grade voice and messaging infrastructure, BoostMyDeal manages the entire sales journey—from first contact to closed deal—with speed, reliability, and precision.\n\n" +
          "Unlike tools built on fragile third-party layers, BoostMyDeal is designed on a telecom-first foundation, allowing modern sales teams to operate at scale with consistent call quality, real-time responsiveness, and dependable execution.",
      },
      {
        label: "Careers",
        description:
          "We’re building the future of AI-driven sales execution and we’re looking for people who want to build systems that actually move the needle.\n\n" +
          "At BoostMyDeal, you’ll work on real problems impacting real revenue, alongside operators, engineers, and strategists who care about performance.",
      },
      {
        label: "Partners",
        description:
          "BoostMyDeal partners with agencies, technology providers, and revenue teams to deliver scalable sales infrastructure.\n\n" +
          "Our partner program enables you to offer AI-powered sales execution to your clients, integrate BoostMyDeal into existing CRM and marketing stacks, and generate recurring revenue through referrals or reselling.\n\n" +
          "Whether you’re a marketing agency, SaaS provider, or systems integrator, BoostMyDeal strengthens your value proposition.",
      },
      {
        label: "Contact",
        description: "Have a question, partnership inquiry, or want to see BoostMyDeal in action?\n\n" + "Reach out to our team and we’ll get back to you promptly.\n\n" + "BoostMyDeal\n1-833-299-DEAL (3325)",
      },
    ],
  },

  {
    title: "Solutions",
    links: [
      {
        label: "AI Monitoring",
        description:
          "BoostMyDeal continuously monitors sales activity, conversations, and pipeline movement to identify opportunities and risks in real time.\n\n" +
          "The system detects missed or delayed follow-ups, high-intent leads requiring escalation, funnel drop-offs, and performance inconsistencies across teams.",
      },
      {
        label: "Smart Integration",
        description: "BoostMyDeal integrates seamlessly with your existing sales and marketing stack, including CRMs, lead sources, calendars, email and SMS platforms, ad platforms, and web forms.\n\n" + "This allows you to orchestrate workflows across tools without replacing what already works.",
      },
      {
        label: "Real-Time Alerts",
        description: "Timing matters in sales. BoostMyDeal delivers real-time alerts when action is required.\n\n" + "Get notified when a high-intent lead enters your system, a prospect requests contact, an AI conversation reaches qualification thresholds, or a deal requires human intervention.",
      },
      {
        label: "Industry Use Cases",
        description:
          "BoostMyDeal adapts to industries where speed-to-lead directly impacts revenue, including high-ticket services, agencies, real estate, insurance, legal services, home services, and B2B sales teams.\n\n" +
          "Each deployment is tailored to industry-specific workflows, compliance requirements, and buyer behaviour.",
      },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        label: "Blog",
        description: "Insights, strategies, and updates on AI, sales automation, revenue operations, and performance optimization.\n\n" + "Learn how top-performing teams use AI to scale without sacrificing quality.",
      },
      {
        label: "GitHub",
        href: "https://github.com/boostmydeal",
        isExternal: true,
        description: "Access documentation, integration examples, and technical resources to extend and customize BoostMyDeal.",
      },
      {
        label: "FAQ",
        href: "/faq",
      },
      {
        label: "Help Center",
        description: "Step-by-step guides, onboarding resources, and support articles to help you get the most out of BoostMyDeal.",
      },
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
