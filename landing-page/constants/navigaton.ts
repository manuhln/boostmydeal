/**
 * Configuration de la navigation par sections
 * Chaque item correspond à une section de la landing page
 */

export interface NavigationItem {
  label: string;
  sectionId: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Product",
    sectionId: "product",
  },
  {
    label: "Solutions",
    sectionId: "solutions",
  },
  {
    label: "Pricing",
    sectionId: "pricing",
  },
  {
    label: "Why Boostmydeal",
    sectionId: "why",
  },
  {
    label: "Resources",
    sectionId: "resources",
  },
];

export const SECTION_IDS = NAVIGATION_ITEMS.map((item) => item.sectionId);
