
"use client";

import type React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface MapLocation {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  dateTime: Date;
  numberOfGuests: number;
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

const libraries: ("places" | "marker")[] = ['places', 'marker'];

export function GoogleMapComponent({ 
  center, 
  zoom = 12,
  mapContainerStyle = defaultMapContainerStyle,
  eventLocations = []
}: GoogleMapComponentProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const [selectedEvents, setSelectedEvents] = useState<MapLocation[] | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{lat: number; lng: number} | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // Keep ID consistent
    googleMapsApiKey: apiKey || "",
    libraries,
    language: 'iw', 
    region: 'IL', 
  });

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
  
  if (loadError) {
    console.error("Google Maps API load error:", loadError);
    return (
        <Alert variant="destructive">
            <MapPin className="h-5 w-5" />
            <AlertTitle>{HEBREW_TEXT.map.errorTitle}</AlertTitle>
            <AlertDescription>{HEBREW_TEXT.map.loadError}</AlertDescription>
        </Alert>
    );
  }

  if (!apiKey) {
    return (
        <Alert variant="destructive">
            <MapPin className="h-5 w-5" />
            <AlertTitle>{HEBREW_TEXT.map.errorTitle}</AlertTitle>
            <AlertDescription>{HEBREW_TEXT.map.apiKeyMissing}</AlertDescription>
        </Alert>
    );
  }

  if (!isLoaded) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  // Define transparentPixelIcon here, now that isLoaded is true
  // and window.google.maps is guaranteed to be available.
  const transparentPixelIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="transparent" stroke="none"/></svg>'),
    scaledSize: new window.google.maps.Size(1, 1),
    anchor: new window.google.maps.Point(0,0),
    labelOrigin: new window.google.maps.Point(0, -10), // Adjust this to position label correctly
  };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
      onClick={handleMapClick}
    >
      {eventLocations.map((loc) => (
        <MarkerF
          key={loc.id + '-' + loc.lat + '-' + loc.lng} 
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => handleMarkerClick(loc)}
          label={{
            text: "💍",
            fontSize: "20px", 
            color: "#000000", 
            className: "map-marker-emoji-label" 
          }}
          icon={transparentPixelIcon}
        />
      ))}

      {selectedEvents && infoWindowPosition && (
        <InfoWindowF
          position={infoWindowPosition}
          onCloseClick={handleMapClick} 
          options={{ 
            pixelOffset: new window.google.maps.Size(0, -25), 
            disableAutoPan: true 
          }} 
        >
          <div className="p-1 space-y-2 max-w-[280px] bg-background rounded-md shadow-lg">
            {selectedEvents.map(event => (
              <div key={event.id} className="border-b border-border last:border-b-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                <Link href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline text-sm block break-words">
                  {event.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.dateTime), 'EEEE, d MMMM HH:mm', { locale: he })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {HEBREW_TEXT.event.numberOfGuests}: {event.numberOfGuests}
                </p>
              </div>
            ))}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}

