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

// LA bounding box for autocomplete bias
const LA_BOUNDS = {
  north: 34.34, south: 33.70,
  east: -117.65, west: -118.67,
};

export const PlacesInput = ({
  value,
  onPlaceSelect,
  placeholder,
  icon = 'Search',
  onVoicePress,
  th,
}: PlacesInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const IconComponent = ICON_MAP[icon] || Search;

  const isDark = th?.isDark ?? true;
  const textColor = th?.text ?? '#ffffff';
  const borderColor = th?.border ?? 'rgba(255,255,255,0.05)';
  const bgColor = th?.surface ?? 'rgba(255,255,255,0.03)';
  const placeholderColor = th?.textMuted ?? '#475569';

  // Sync external value changes into the input (e.g. GPS fill)
  useEffect(() => {
    if (inputRef.current && inputRef.current !== document.activeElement) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  // Placeholder color via CSS variable
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.setProperty('--ph-color', placeholderColor);
    }
  }, [placeholderColor]);

  // Attach Google Places Autocomplete once Maps API is ready
  useEffect(() => {
    const attach = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;
      if (autocompleteRef.current) return; // already attached

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['geocode', 'establishment'],
          bounds: new window.google.maps.LatLngBounds(
            { lat: LA_BOUNDS.south, lng: LA_BOUNDS.west },
            { lat: LA_BOUNDS.north, lng: LA_BOUNDS.east }
          ),
          strictBounds: false,
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current!.getPlace();
        const address = place.formatted_address ?? place.name ?? '';
        if (address) onPlaceSelect(address);
      });
    };

    // Maps may already be loaded, or we wait for the callback
    if (window.google?.maps?.places) {
      attach();
    } else {
      // Poll briefly until Maps loads (it loads async via the script tag)
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval);
          attach();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  // Constrain the PAC dropdown: watch body for insertion, then watch the pac-container's
  // own style attribute so we override every time Google repositions/resizes it.
  useEffect(() => {
    let pacObserver: MutationObserver | null = null;

    const applyFix = (pac: HTMLElement) => {
      if (!inputRef.current) return;
      // Only act when THIS input is the active one — prevents competing observers
      // between multiple PlacesInput instances from fighting each other infinitely.
      if (document.activeElement !== inputRef.current) return;

      // Walk up the DOM to find the phone-frame container (first overflow:hidden
      // ancestor with a meaningful width). Both inputs share the same frame so
      // the dropdown width ends up identical regardless of which input is active.
      let frameEl: HTMLElement | null = null;
      let ancestor: HTMLElement | null = inputRef.current.parentElement;
      while (ancestor && ancestor !== document.body) {
        const cs = window.getComputedStyle(ancestor);
        if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && ancestor.offsetWidth >= 300) {
          frameEl = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }

      const inputRect = inputRef.current.getBoundingClientRect();
      const frameRect = frameEl?.getBoundingClientRect();
      // Span from this input's left edge to the frame's right edge (- 8 px margin)
      const maxRight = frameRect ? frameRect.right - 8 : window.innerWidth - 8;
      const w = `${maxRight - inputRect.left}px`;
      const l = `${inputRect.left}px`;
      if (pac.style.width === w && pac.style.left === l) return;
      pac.style.setProperty('width', w, 'important');
      pac.style.setProperty('max-width', w, 'important');
      pac.style.setProperty('left', l, 'important');
    };

    const attachPacObserver = (pac: HTMLElement) => {
      applyFix(pac);
      pacObserver = new MutationObserver(() => applyFix(pac));
      pacObserver.observe(pac, { attributes: true, attributeFilter: ['style'] });
    };

    // Phase 1: watch body for the pac-container being added to the DOM
    const bodyObserver = new MutationObserver(() => {
      const pac = document.querySelector('.pac-container') as HTMLElement | null;
      if (pac && !pacObserver) attachPacObserver(pac);
    });
    bodyObserver.observe(document.body, { childList: true });

    // In case the pac-container already exists (e.g. shared across inputs)
    const existing = document.querySelector('.pac-container') as HTMLElement | null;
    if (existing) attachPacObserver(existing);

    return () => {
      bodyObserver.disconnect();
      pacObserver?.disconnect();
    };
  }, []);

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
