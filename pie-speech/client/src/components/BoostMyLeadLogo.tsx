import { useTheme } from '@/contexts/ThemeContext';
import ppLogoBlack from '@assets/PP Logo Black_1762759467336.png';
import ppLogoWhite from '@assets/PP Logo White_1762759467337.png';

interface BoostMyLeadLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function BoostMyLeadLogo({ className = "", width = 120, height = 40 }: BoostMyLeadLogoProps) {
  const { theme } = useTheme();
  
  // Dark theme (dark background) uses white logo, light theme (light background) uses black logo
  const logoSrc = theme === 'dark' ? ppLogoWhite : ppLogoBlack;
  
  return (
    <img
      src={logoSrc}
      alt="Pie-Speech Logo"
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
