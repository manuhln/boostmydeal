"use client";

/**
 * Hook qui fournit une fonction pour scroller vers une section
 *
 * @param offset - Offset depuis le top (utile pour compenser la hauteur du header fixe)
 * @returns Fonction scrollToSection qui prend un sectionId en paramètre
 */
export function useScrollToSection(offset: number = 80) {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);

    if (element) {
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return scrollToSection;
}
