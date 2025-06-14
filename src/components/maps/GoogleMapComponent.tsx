
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

const libraries: ("places" | "marker")[] = ['places', 'marker']; // Include marker library

export function GoogleMapComponent({ 
  center, 
  zoom = 12, // Default zoom adjusted to show a wider area for events
  mapContainerStyle = defaultMapContainerStyle,
  eventLocations = []
}: GoogleMapComponentProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedMarker, setSelectedMarker] = useState<MapLocation | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
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
      <MarkerF 
        position={center} 
        title={HEBREW_TEXT.map.yourLocationMarker} 
        // Optional: Differentiate user's location marker (e.g., different icon or color)
        // icon={{
        //   url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" 
        // }}
      />
      {eventLocations.map((loc, index) => (
        <MarkerF
          key={index}
          position={{ lat: loc.lat, lng: loc.lng }}
          title={loc.name || HEBREW_TEXT.map.eventLocationMarker}
          onClick={() => setSelectedMarker(loc)}
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
