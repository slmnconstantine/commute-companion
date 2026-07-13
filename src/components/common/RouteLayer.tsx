/**
 * RouteLayer — Reusable premium route polyline component
 *
 * Renders a multi-layered route visualization on MapLibre maps:
 * 1. Glow/shadow underlay (wide, semi-transparent)
 * 2. Casing outline (medium, darker)
 * 3. Main route line (narrow, vibrant primary color)
 *
 * Accepts a GeoJSON LineString feature and theme colors.
 */

import React from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

interface RouteLayerProps {
  /** Unique source/layer ID prefix (to avoid conflicts when multiple routes are on screen) */
  id?: string;
  /** GeoJSON Feature with LineString geometry */
  routeGeoJSON: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: number[][];
    };
    properties: any;
  } | null;
  /** Primary route color (main visible line) */
  color?: string;
  /** Glow / underlay color (wide, semi-transparent) */
  glowColor?: string;
  /** Casing / outline color */
  casingColor?: string;
  /** Whether to show the glow underlay */
  showGlow?: boolean;
}

export default function RouteLayer({
  id = 'route',
  routeGeoJSON,
  color = '#10B981',
  glowColor = 'rgba(16, 185, 129, 0.15)',
  casingColor = 'rgba(5, 150, 105, 0.4)',
  showGlow = true,
}: RouteLayerProps) {
  if (!routeGeoJSON) return null;

  return (
    <GeoJSONSource id={`${id}-source`} data={routeGeoJSON}>
      {/* Layer 1: Glow / shadow underlay */}
      {showGlow && (
        <Layer
          id={`${id}-glow`}
          type="line"
          paint={{
            'line-color': glowColor,
            'line-width': 14,
            'line-blur': 6,
          }}
          layout={{
            'line-cap': 'round',
            'line-join': 'round',
          }}
        />
      )}

      {/* Layer 2: Casing / outline */}
      <Layer
        id={`${id}-casing`}
        type="line"
        paint={{
          'line-color': casingColor,
          'line-width': 7,
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />

      {/* Layer 3: Main route line */}
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{
          'line-color': color,
          'line-width': 4,
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
    </GeoJSONSource>
  );
}
