"use client";

import { useState, useEffect } from "react";

/**
 * Hook qui détecte quelle section est actuellement visible dans le viewport
 *
 * @param sectionIds - Liste des IDs des sections à surveiller (ex: ['hero', 'features', 'pricing'])
 * @param offset - Offset depuis le top pour considérer une section comme active (en pixels)
 * @returns L'ID de la section actuellement active
 */
export function useActiveSection(sectionIds: string[], offset: number = 100) {
  const [activeSection, setActiveSection] = useState<string>(sectionIds[0] || "");

  useEffect(() => {
    const handleScroll = () => {
      // Position actuelle du scroll + offset
      const scrollPosition = window.scrollY + offset;

      // Parcourir toutes les sections
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const sectionId = sectionIds[i];
        const element = document.getElementById(sectionId);

        if (element) {
          const { offsetTop, offsetHeight } = element;

          // Si on est dans la zone de cette section
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }

      // Cas spécial : si on est tout en haut de la page
      if (window.scrollY < 100) {
        setActiveSection(sectionIds[0]);
      }
    };

    // Appel initial
    handleScroll();

    // Écouter le scroll
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionIds, offset]);

  return activeSection;
}
