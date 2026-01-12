// Images du dossier public
export const Images = {
  // Logos
  logo: "/logo.png",
  logoText: "/logoText.png",
  FooterLogo: "/footerLogo.png",

  // Icons/Illustrations
  heroIllustration: "/images/hero-illustration.png",
  featureIcon1: "/images/feature-1.png",
  featureIcon2: "/images/feature-2.png",

  // Avatars
  avatar1: "/avatars/user-1.jpg",
  avatar2: "/avatars/user-2.jpg",

  // Backgrounds
  heroBg: "/backgrounds/hero-bg.png",
  patternBg: "/backgrounds/pattern.svg",

  //Partner
  partner1: "/partners/Partner1.png",
  partner2: "/partners/Partner2.png",
  partner3: "/partners/Partner3.png",
  partner4: "/partners/Partner4.png",
  partner5: "/partners/Partner5.png",
  partner6: "/partners/Partner6.png",
  partner7: "/partners/Partner7.png",
  partner8: "/partners/Partner8.png",

  //Content
  pain: "/content/pain.png",
  proof: "/content/proof.png",
  solu: "/content/solu.png",
  solubg: "/content/solubg.png",
  feature1: "/content/feature (1).png",
  feature2: "/content/feature (2).png",
  feature3: "/content/feature (3).png",
  feature4: "/content/feature (4).png",
  feature5: "/content/feature (5).png",
  feature6: "/content/feature (6).png",
} as const;

export type ImageKey = keyof typeof Images;
