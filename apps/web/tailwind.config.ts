import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dell-blue': '#0076CE',
        'dell-blue-hover': '#005FA3',
        'dell-dark': '#004B87',
        'bg-body': '#F5F5F5',
        'bg-card': '#FFFFFF',
        'border-card': '#D8D8D8',
        'card-header': '#E8EEF4',
        'row-alt': '#FAFAFA',
        'row-hover': '#E6F3FF',
        'green-healthy': '#2E8540',
        'amber-warning': '#C77700',
        'red-critical': '#C0392B',
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
      },
      borderRadius: { DEFAULT: '2px', sm: '2px', md: '4px', lg: '6px' },
      fontFamily: { sans: ['"Open Sans"', 'Roboto', 'system-ui', 'sans-serif'] },
      maxWidth: { layout: '1440px' },
    },
  },
  plugins: [],
};
export default config;
