/**
 * Jagrut App Theme
 * A stark, utilitarian, high-contrast palette meant to evoke 
 * government transparency, accountability, and clarity.
 */

export const Theme = {
  colors: {
    // Backgrounds
    background: '#FFFFFF',       // Pure white for stark contrast
    surface: '#F5F5F5',          // Very light gray for cards
    surfaceDark: '#121212',      // Deep black for contrast cards (e.g. politician card)
    
    // Text
    textPrimary: '#000000',      // Pure black text
    textSecondary: '#666666',    // Dark gray for secondary info
    textInverse: '#FFFFFF',      // White text for dark surfaces
    
    // Accents & Signals
    primary: '#0052CC',          // Utilitarian hyperlink blue
    danger: '#D10000',           // High contrast red for deficits/losses
    success: '#008700',          // High contrast green for growth/gains
    warning: '#F5A623',          // Amber for pending states
    
    // Borders
    border: '#E0E0E0',
    borderDark: '#333333',
  },
  
  typography: {
    h1: { fontSize: 32, fontWeight: '800', color: '#000000' },
    h2: { fontSize: 24, fontWeight: '700', color: '#000000' },
    h3: { fontSize: 18, fontWeight: '600', color: '#000000' },
    body1: { fontSize: 16, fontWeight: '400', color: '#333333' },
    body2: { fontSize: 14, fontWeight: '400', color: '#666666' },
    caption: { fontSize: 12, fontWeight: '500', color: '#666666', textTransform: 'uppercase' },
    statLarge: { fontSize: 42, fontWeight: '900' },
  },
  
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
  },
  
  shadows: {
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    heavy: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    }
  }
} as const;
