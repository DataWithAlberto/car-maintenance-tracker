// Type declarations for Lordicon web component (<lord-icon>)
// Docs: https://lordicon.com/docs

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        trigger?:
          | 'hover'
          | 'hover-loop'
          | 'click'
          | 'loop'
          | 'loop-on-hover'
          | 'boomerang'
          | 'morph'
          | 'morph-two-way'
          | 'sequence'
          | 'none';
        colors?: string; // e.g. "primary:#1d1d1f,secondary:#0071e3"
        stroke?: 'light' | 'regular' | 'bold';
        delay?: number;
        loading?: 'lazy' | 'interaction';
      };
    }
  }
}
