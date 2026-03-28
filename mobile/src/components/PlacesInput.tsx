import { useRef, useEffect } from 'react';
import { Mic, MapPin, Circle, Search } from 'lucide-react';
import { THEME_MODES } from '../store/LanguageContext';

type ThemeColors = typeof THEME_MODES['day'];

interface PlacesInputProps {
  value: string;
  onPlaceSelect: (address: string) => void;
  placeholder: string;
  icon?: 'Circle' | 'MapPin' | 'Search';
  onVoicePress?: () => void;
  th?: ThemeColors;
}

const ICON_MAP = { Circle, MapPin, Search };

export const PlacesInput = ({
  value,
  onPlaceSelect,
  placeholder,
  icon = 'Search',
  onVoicePress,
  th,
}: PlacesInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const IconComponent = ICON_MAP[icon] || Search;

  const isDark = th?.isDark ?? true;
  const textColor = th?.text ?? '#ffffff';
  const borderColor = th?.border ?? 'rgba(255,255,255,0.05)';
  const bgColor = th?.surface ?? 'rgba(255,255,255,0.03)';
  const placeholderColor = th?.textMuted ?? '#475569';

  useEffect(() => {
    if (inputRef.current && inputRef.current !== document.activeElement) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  // Update placeholder color via CSS variable on the input element
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.setProperty('--ph-color', placeholderColor);
    }
  }, [placeholderColor]);

  return (
    <div style={{ ...containerStyle, backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
      <div style={iconContainerStyle}>
        <IconComponent size={20} color={th?.textMuted ?? '#94a3b8'} />
      </div>
      <input
        ref={inputRef}
        defaultValue={value}
        placeholder={placeholder}
        style={{ ...inputStyle, color: textColor }}
        className={isDark ? 'places-input-dark' : 'places-input-light'}
        autoComplete="off"
        spellCheck={false}
        onBlur={(e) => { if (e.target.value.trim()) onPlaceSelect(e.target.value.trim()); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      {onVoicePress && (
        <button onClick={onVoicePress} style={voiceButtonStyle} type="button">
          <Mic size={20} color="#3b82f6" />
        </button>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 16,
  paddingLeft: 16,
  paddingRight: 8,
  height: 56,
  gap: 12,
  width: '100%',
  boxSizing: 'border-box',
};

const iconContainerStyle: React.CSSProperties = {
  width: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 16,
  fontWeight: '500',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
  minWidth: 0,
};

const voiceButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
