function IconBase({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      {children}
    </svg>
  );
}

export function Activity(props) {
  return (
    <IconBase {...props}>
      <path d="M3 12h4l2.5-6 5 12L17 12h4" />
    </IconBase>
  );
}

export function ShieldCheck(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v5c0 4.5-2.6 7.8-7 10-4.4-2.2-7-5.5-7-10V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </IconBase>
  );
}

export function Sparkles(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      <path d="m5.5 14 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </IconBase>
  );
}

export function FileText(props) {
  return (
    <IconBase {...props}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h6" />
    </IconBase>
  );
}

export function LayoutDashboard(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </IconBase>
  );
}

export function LogOut(props) {
  return (
    <IconBase {...props}>
      <path d="M10 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
      <path d="M21 12H9" />
      <path d="m17 8 4 4-4 4" />
    </IconBase>
  );
}

export function MapPin(props) {
  return (
    <IconBase {...props}>
      <path d="M12 21s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

export function Menu(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

export function PenSquare(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m15.5 7.5 1 1a1.4 1.4 0 0 1 0 2l-6.8 6.8L7 18l.7-2.7 6.8-6.8a1.4 1.4 0 0 1 2 0Z" />
    </IconBase>
  );
}

export function UserPlus(props) {
  return (
    <IconBase {...props}>
      <path d="M15 20a6 6 0 0 0-12 0" />
      <circle cx="9" cy="8" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </IconBase>
  );
}

export function X(props) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

export function ChevronUp(props) {
  return (
    <IconBase {...props}>
      <path d="m6 14 6-6 6 6" />
    </IconBase>
  );
}

export function ChevronDown(props) {
  return (
    <IconBase {...props}>
      <path d="m6 10 6 6 6-6" />
    </IconBase>
  );
}

export function Users(props) {
  return (
    <IconBase {...props}>
      <path d="M16 20a4 4 0 0 0-8 0" />
      <circle cx="12" cy="9" r="4" />
      <path d="M22 20a4 4 0 0 0-4-4" />
      <path d="M2 20a4 4 0 0 1 4-4" />
    </IconBase>
  );
}

export function Layers3(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </IconBase>
  );
}

export function Eye(props) {
  return (
    <IconBase {...props}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

export function EyeOff(props) {
  return (
    <IconBase {...props}>
      <path d="m3 3 18 18" />
      <path d="M10.6 6.3A11.8 11.8 0 0 1 12 6c6.4 0 10 6 10 6a18 18 0 0 1-3.4 4.1" />
      <path d="M6.2 6.2A18.5 18.5 0 0 0 2 12s3.6 6 10 6c1.5 0 2.8-.3 4-.8" />
    </IconBase>
  );
}

export function Clock3(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function Database(props) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="5" rx="7.5" ry="2.5" />
      <path d="M4.5 5v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V5" />
      <path d="M4.5 11v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-6" />
    </IconBase>
  );
}

export function Info(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </IconBase>
  );
}

export function ImageIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-4.5-4.5L8 20" />
    </IconBase>
  );
}

export function PhoneCall(props) {
  return (
    <IconBase {...props}>
      <path d="M14 4a6 6 0 0 1 6 6" />
      <path d="M14 1a9 9 0 0 1 9 9" />
      <path d="M5.3 4.8a2 2 0 0 1 2.8-.1l1.7 1.7a2 2 0 0 1 .3 2.4l-1 1.5a14 14 0 0 0 5.8 5.8l1.5-1a2 2 0 0 1 2.4.3l1.7 1.7a2 2 0 0 1-.1 2.8l-1 1a3 3 0 0 1-2.7.8A19 19 0 0 1 4.5 7.5a3 3 0 0 1 .8-2.7l1-1Z" />
    </IconBase>
  );
}

export function Star(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8l-5.3 2.8 1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </IconBase>
  );
}

export function CircleHelp(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.4-1.7 2.7" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}
