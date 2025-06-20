
"use client";

import type React from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { MapPin, Users, CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface MapLocation {
  id: string;
  lat: number;
  lng: number;
  eventName: string;
  locationDisplayName: string;
  dateTime: Date;
  numberOfGuests: number; // This should represent AVAILABLE spots
}

interface GoogleMapComponentProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  mapContainerStyle?: React.CSSProperties;
  eventLocations?: MapLocation[];
}

const defaultMapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

// libraries prop is not used here anymore as useJsApiLoader is removed

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const baseMapOptions: Omit<google.maps.MapOptions, 'styles'> = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const lightMapOptions: google.maps.MapOptions = {
  ...baseMapOptions,
};

const darkThemeMapOptions: google.maps.MapOptions = {
  ...baseMapOptions,
  styles: darkMapStyles,
};


export function GoogleMapComponent({ 
  center, 
  zoom = 12,
  mapContainerStyle = defaultMapContainerStyle,
  eventLocations = []
}: GoogleMapComponentProps) {
  
  const [selectedEvents, setSelectedEvents] = useState<MapLocation[] | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{lat: number; lng: number} | null>(null);
  const [eventMarkerIcon, setEventMarkerIcon] = useState<google.maps.Icon | null>(null);
  const [currentMapOptions, setCurrentMapOptions] = useState<google.maps.MapOptions>(lightMapOptions);

  // The useJsApiLoader hook is removed from this component.
  // The parent component (e.g., FullMapPage) is responsible for loading the API.

  useEffect(() => {
    // Assuming the API is loaded because the parent component controls rendering.
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      setEventMarkerIcon({
        url: '/ring-marker.png', 
        scaledSize: new window.google.maps.Size(36, 48), 
        anchor: new window.google.maps.Point(18, 48),
      });
    }
  }, []); // Runs once on mount

  useEffect(() => {
    // This effect handles theme changes
    if (typeof window === 'undefined' || !window.google || !window.google.maps) return;

    const applyThemeStyles = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setCurrentMapOptions(isDarkMode ? darkThemeMapOptions : lightMapOptions);
    };

    applyThemeStyles(); 

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          applyThemeStyles();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []); // Runs once on mount and re-runs if documentElement class changes (indirectly)


  const handleMarkerClick = (clickedLocation: MapLocation) => {
    const eventsAtSameSpot = eventLocations.filter(
      loc => loc.lat === clickedLocation.lat && loc.lng === clickedLocation.lng
    );
    setSelectedEvents(eventsAtSameSpot.length > 0 ? eventsAtSameSpot : null);
    setInfoWindowPosition(eventsAtSameSpot.length > 0 ? { lat: clickedLocation.lat, lng: clickedLocation.lng } : null);
  };

  const handleMapClick = () => {
    setSelectedEvents(null);
    setInfoWindowPosition(null);
  };
  
  // Conditional rendering based on API key or loadError is handled by the parent.
  // Skeleton for loading marker icon is still useful if eventMarkerIcon is not yet set.
  if (!eventMarkerIcon) { 
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={currentMapOptions}
      onClick={handleMapClick}
    >
      {eventLocations.map((loc) => (
        <MarkerF
          key={loc.id + '-' + loc.lat + '-' + loc.lng} 
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => handleMarkerClick(loc)}
          icon={eventMarkerIcon} // eventMarkerIcon is now set in useEffect
          title={loc.eventName || HEBREW_TEXT.event.eventNameGenericPlaceholder}
        />
      ))}

      {selectedEvents && infoWindowPosition && window.google && window.google.maps && ( // Ensure google.maps is available
        <InfoWindowF
          position={infoWindowPosition}
          onCloseClick={handleMapClick} 
          options={{ 
            pixelOffset: new window.google.maps.Size(0, -50), 
            disableAutoPan: true 
          }} 
        >
          <div className="p-2 space-y-2 max-w-[280px] bg-background rounded-md shadow-lg text-right">
            {selectedEvents.length === 1 ? (
              (() => {
                const event = selectedEvents[0];
                return (
                  <div>
                    <Link href={`/events/${event.id}`} className="font-headline text-primary hover:underline text-base block break-words mb-1">
                      {event.eventName || HEBREW_TEXT.event.eventNameGenericPlaceholder}
                    </Link>
                    <div className="space-y-1 text-sm">
                        <p className="flex items-center text-muted-foreground">
                            <MapPin className="ml-1.5 h-4 w-4 text-primary/80 flex-shrink-0" />
                            {event.locationDisplayName}
                        </p>
                        <p className="flex items-center text-muted-foreground">
                            <CalendarDays className="ml-1.5 h-4 w-4 text-primary/80 flex-shrink-0" />
                            {format(new Date(event.dateTime), 'dd.MM.yyyy', { locale: he })}
                        </p>
                        <p className="flex items-center text-muted-foreground">
                            <Users className="ml-1.5 h-4 w-4 text-primary/80 flex-shrink-0" />
                             {HEBREW_TEXT.event.availableSpots}: {event.numberOfGuests > 0 ? event.numberOfGuests : HEBREW_TEXT.event.noSpotsAvailableShort }
                        </p>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <h3 className="font-headline text-md text-foreground mb-2 text-center border-b pb-1">
                  {selectedEvents[0].locationDisplayName}
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedEvents.map(event => (
                    <div key={event.id} className="border-b border-border/50 last:border-b-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                      <Link href={`/events/${event.id}`} className="font-semibold text-primary hover:underline text-sm block break-words">
                        {event.eventName || HEBREW_TEXT.event.eventNameGenericPlaceholder}
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <CalendarDays className="ml-1 h-3 w-3 text-primary/70 flex-shrink-0" />
                        {format(new Date(event.dateTime), 'dd.MM.yyyy', { locale: he })}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Users className="ml-1 h-3 w-3 text-primary/70 flex-shrink-0" />
                        {HEBREW_TEXT.event.availableSpots}: {event.numberOfGuests > 0 ? event.numberOfGuests : HEBREW_TEXT.event.noSpotsAvailableShort}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
