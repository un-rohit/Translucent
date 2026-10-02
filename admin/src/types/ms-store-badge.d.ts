// Type declarations for Microsoft Store Badge Web Component
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ms-store-badge': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          productid?: string;
          productname?: string;
          'window-mode'?: string;
          theme?: string;
          size?: string;
          language?: string;
          animation?: string;
          cid?: string;
        },
        HTMLElement
      >;
    }
  }
}
