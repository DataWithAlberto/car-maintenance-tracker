/**
 * LordIcon — Wrapper for Lordicon animated web components.
 * Browse icons at https://lordicon.com/icons (free filter available)
 *
 * Usage:
 *   <LordIcon icon="home" trigger="click" size={28} />
 *   <LordIcon src="https://cdn.lordicon.com/YOUR-ID.json" trigger="hover" />
 */

// ─── Icon library ─────────────────────────────────────────────────────────────
// Keys map to Lordicon CDN URLs. Replace any URL with one from lordicon.com.
// eslint-disable-next-line react-refresh/only-export-components
export const LORD_ICONS = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  home: 'https://cdn.lordicon.com/wmwqvixz.json', // house
  car: 'https://cdn.lordicon.com/hbtheitu.json', // car
  wrench: 'https://cdn.lordicon.com/oaflahpk.json', // wrench / tools
  route: 'https://cdn.lordicon.com/nqtddedc.json', // route / map pin
  more: 'https://cdn.lordicon.com/unvlvkmi.json', // grid / more
  settings: 'https://cdn.lordicon.com/hwjcdnil.json', // gear / settings
  dashboard: 'https://cdn.lordicon.com/ndydpcaq.json', // layout grid

  // ── Status & connection ──────────────────────────────────────────────────────
  bluetooth: 'https://cdn.lordicon.com/wowgbfqe.json', // bluetooth
  wifi: 'https://cdn.lordicon.com/vspbqszr.json', // signal / wifi
  connected: 'https://cdn.lordicon.com/oyvitrzs.json', // checkmark circle
  alert: 'https://cdn.lordicon.com/yqopcxhs.json', // alert triangle
  info: 'https://cdn.lordicon.com/hnlofbsv.json', // info circle

  // ── Maintenance & vehicle ────────────────────────────────────────────────────
  engine: 'https://cdn.lordicon.com/dxjqoygy.json', // pulse / activity
  fuel: 'https://cdn.lordicon.com/gsjfryhh.json', // fuel / drop
  battery: 'https://cdn.lordicon.com/yxczfiyc.json', // battery
  thermometer: 'https://cdn.lordicon.com/mrdiiocb.json', // temperature
  gauge: 'https://cdn.lordicon.com/rqwjmjib.json', // speed / gauge

  // ── Finances & documents ─────────────────────────────────────────────────────
  wallet: 'https://cdn.lordicon.com/qhgmphtg.json', // wallet
  receipt: 'https://cdn.lordicon.com/wloilxuq.json', // receipt
  document: 'https://cdn.lordicon.com/nbqnnxoy.json', // document
  calendar: 'https://cdn.lordicon.com/abfverha.json', // calendar
  download: 'https://cdn.lordicon.com/fqrjldna.json', // download
  upload: 'https://cdn.lordicon.com/fifjoxiy.json', // upload / export

  // ── Actions ──────────────────────────────────────────────────────────────────
  search: 'https://cdn.lordicon.com/msoeawqm.json', // search
  add: 'https://cdn.lordicon.com/xzksbhvs.json', // plus / add
  trash: 'https://cdn.lordicon.com/wpyrrmcq.json', // trash
  edit: 'https://cdn.lordicon.com/pflgjkjr.json', // pencil / edit
  share: 'https://cdn.lordicon.com/tljgagqf.json', // share
  copy: 'https://cdn.lordicon.com/iykgtsbt.json', // copy
  refresh: 'https://cdn.lordicon.com/klinmavr.json', // refresh / sync

  // ── People & social ───────────────────────────────────────────────────────────
  user: 'https://cdn.lordicon.com/bhfjfgqz.json', // user
  map: 'https://cdn.lordicon.com/nqtddedc.json', // map / location
  store: 'https://cdn.lordicon.com/rbbnmpcf.json', // store / shop
} as const;

export type LordIconName = keyof typeof LORD_ICONS;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** Named icon from the LORD_ICONS library */
  icon?: LordIconName;
  /** Or use a direct CDN URL: "https://cdn.lordicon.com/XXXX.json" */
  src?: string;
  trigger?:
    | 'hover'
    | 'hover-loop'
    | 'click'
    | 'loop'
    | 'loop-on-hover'
    | 'boomerang'
    | 'morph'
    | 'none';
  size?: number;
  /** Icon stroke weight: light · regular · bold */
  stroke?: 'light' | 'regular' | 'bold';
  /** Primary color (CSS value or hex) */
  primaryColor?: string;
  /** Secondary color (CSS value or hex) */
  secondaryColor?: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  className?: string;
}

export const LordIcon = ({
  icon,
  src,
  trigger = 'hover',
  size = 24,
  stroke = 'regular',
  primaryColor = '#1d1d1f',
  secondaryColor,
  delay,
  className,
}: Props) => {
  const iconSrc = src ?? (icon ? LORD_ICONS[icon] : undefined);
  if (!iconSrc) return null;

  const colors = secondaryColor
    ? `primary:${primaryColor},secondary:${secondaryColor}`
    : `primary:${primaryColor}`;

  return (
    <lord-icon
      src={iconSrc}
      trigger={trigger}
      colors={colors}
      stroke={stroke}
      delay={delay}
      className={className}
      style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    />
  );
};
