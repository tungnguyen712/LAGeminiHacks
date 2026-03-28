import { useRef, useEffect } from 'react';
import { Mic, MapPin, Circle, Search } from 'lucide-react';

interface PlacesInputProps {
  value: string;
  onPlaceSelect: (address: string) => void;
  placeholder: string;
  icon?: 'Circle' | 'MapPin' | 'Search';
  onVoicePress?: () => void;
}

const ICON_MAP = { Circle, MapPin, Search };

export const PlacesInput = ({
  value,
  onPlaceSelect,
  placeholder,
  icon = 'Search',
  onVoicePress,
}: PlacesInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const IconComponent = ICON_MAP[icon] || Search;

  // Sync value from parent (e.g. GPS fill) without disrupting typing
  useEffect(() => {
    if (inputRef.current && inputRef.current !== document.activeElement) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  return (
    <div style={containerStyle}>
      <div style={iconContainerStyle}>
        <IconComponent size={20} color="#94a3b8" />
      </div>
      <input
        ref={inputRef}
        defaultValue={value}
        placeholder={placeholder}
        style={inputStyle}
        className="places-input"
        autoComplete="off"
        spellCheck={false}
        onBlur={(e) => { if (e.target.value.trim()) onPlaceSelect(e.target.value.trim()); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
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
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.05)',
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
  color: '#ffffff',
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
