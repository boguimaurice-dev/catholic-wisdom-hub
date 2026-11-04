import type { ReactNode, SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  strokeWidth?: number;
}

function createIcon(paths: ReactNode, fillRule?: "evenodd") {
  return function Icon({ size = 20, strokeWidth = 1.75, ...rest }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillRule={fillRule}
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const Shield = createIcon(
  <path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />,
);

export const ShieldCheck = createIcon(
  <>
    <path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
    <path d="M9 11.5l2 2 4-4" />
  </>,
);

export const Lock = createIcon(
  <>
    <rect x="3.5" y="10.5" width="17" height="10.5" rx="2.5" />
    <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </>,
);

export const Unlock = createIcon(
  <>
    <rect x="3.5" y="10.5" width="17" height="10.5" rx="2.5" />
    <path d="M7.5 10.5V7a4.5 4.5 0 0 1 8.7-1.6" />
  </>,
);

export const Plus = createIcon(<path d="M12 5v14M5 12h14" />);

export const Search = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20.5 20.5l-4.2-4.2" />
  </>,
);

export const Key = createIcon(
  <>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.8 12.2L21 2M17 6l3 3M14 9l3 3" />
  </>,
);

export const FileText = createIcon(
  <>
    <path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z" />
    <path d="M14 2.5v5h5M9 13h6M9 17h4" />
  </>,
);

export const User = createIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c0-4 3.4-6.5 7.5-6.5S19.5 17 19.5 21" />
  </>,
);

export const Eye = createIcon(
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOff = createIcon(
  <>
    <path d="M9.9 5.3A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-3.2 4.1M6.2 6.7A17.7 17.7 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.3-1" />
    <path d="M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);

export const Copy = createIcon(
  <>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
  </>,
);

export const Check = createIcon(<path d="M20 6L9 17l-5-5" />);

export const Trash = createIcon(
  <>
    <path d="M3.5 6.5h17M9 6.5V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8v1.7" />
    <path d="M6 6.5l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-13" />
    <path d="M10.5 10.5v7M13.5 10.5v7" />
  </>,
);

export const Pencil = createIcon(
  <>
    <path d="M12.5 20.5H21" />
    <path d="M16.4 3.6a2.2 2.2 0 0 1 3.1 3.1L7.4 18.8l-4.2 1.2 1.2-4.2z" />
  </>,
);

export const Star = createIcon(
  <path d="M12 3.2l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.8l6.2-.9z" />,
);

export const Settings = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.4 6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
  </>,
);

export const Download = createIcon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7.5 10.5L12 15l4.5-4.5M12 15V3" />
  </>,
);

export const Upload = createIcon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7.5 7.5L12 3l4.5 4.5M12 3v12" />
  </>,
);

export const Dice = createIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </>,
);

export const Refresh = createIcon(
  <>
    <path d="M21 12a9 9 0 1 1-2.6-6.3" />
    <path d="M21 3v5h-5" />
  </>,
);

export const Menu = createIcon(<path d="M4 7h16M4 12h16M4 17h16" />);

export const X = createIcon(<path d="M18 6L6 18M6 6l12 12" />);

export const ChevronLeft = createIcon(<path d="M15 18l-6-6 6-6" />);

export const ChevronRight = createIcon(<path d="M9 18l6-6-6-6" />);

export const ChevronDown = createIcon(<path d="M6 9l6 6 6-6" />);

export const Globe = createIcon(
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5a15 15 0 0 1 0 19 15 15 0 0 1 0-19z" />
  </>,
);

export const Tag = createIcon(
  <>
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2.5 12.5V2.5h10l8.1 8.1a2 2 0 0 1 0 2.8z" />
    <circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none" />
  </>,
);

export const AlertTriangle = createIcon(
  <>
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4.5M12 17.2h.01" />
  </>,
);

export const Sparkles = createIcon(
  <>
    <path d="M12 3l1.7 4.6L18.3 9.3l-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7z" />
    <path d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </>,
);

export const Sun = createIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);

export const Moon = createIcon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);

export const ExternalLink = createIcon(
  <>
    <path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5" />
    <path d="M15 3h6v6M10.5 13.5L21 3" />
  </>,
);

export const Clock = createIcon(
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7v5.3l3.5 2" />
  </>,
);

export const Info = createIcon(
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5.5M12 7.8h.01" />
  </>,
);

export const Grid = createIcon(
  <>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </>,
);

export const Smartphone = createIcon(
  <>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </>,
);

export const Power = createIcon(
  <>
    <path d="M12 3v9" />
    <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
  </>,
);
