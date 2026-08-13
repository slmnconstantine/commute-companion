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
  color = '#0057FF',
  glowColor = 'rgba(0, 87, 255, 0.18)',
  casingColor = 'rgba(0, 64, 193, 0.40)',
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
          style={{
            lineColor: glowColor,
            lineWidth: 12,
            lineBlur: 4,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* Layer 2: Casing / outline */}
      <Layer
        id={`${id}-casing`}
        type="line"
        style={{
          lineColor: casingColor,
          lineWidth: 7,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Layer 3: Main route line (Signal Blue) */}
      <Layer
        id={`${id}-line`}
        type="line"
        style={{
          lineColor: color,
          lineWidth: 4,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </GeoJSONSource>
  );
}
