
"use client";

import type React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

interface MapLocation {
  lat: number;
  lng: number;
  name?: string; // For event names
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
  const [selectedMarker, setSelectedMarker] = useState<MapLocation | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // Consistent ID
    googleMapsApiKey: apiKey || "",
    libraries,
    language: 'iw', 
    region: 'IL', 
  });

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
      onClick={() => setSelectedMarker(null)} // Close InfoWindow when map is clicked
    >
      {/* The explicit MarkerF for the user's 'center' location has been removed. */}
      {/* The map will now use its default indicator (usually a blue dot) for the 'center'. */}

      {eventLocations.map((loc, index) => (
        <MarkerF
          key={index}
          position={{ lat: loc.lat, lng: loc.lng }}
          title={loc.name || HEBREW_TEXT.map.eventLocationMarker}
          onClick={() => setSelectedMarker(loc)}
          // Event markers will use the default red pin
        />
      ))}

      {selectedMarker && (
        <InfoWindowF
          position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
          onCloseClick={() => setSelectedMarker(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        >
          <div>
            <h4 className="font-semibold">{selectedMarker.name || 'אירוע'}</h4>
            {/* Add more details here if needed, e.g., link to event page */}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}

