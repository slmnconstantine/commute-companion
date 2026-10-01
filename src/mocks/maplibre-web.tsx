import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LogManager = {
  onLog: (_cb?: any) => () => {},
  setLogLevel: (_level?: any) => {},
};

export const Map = React.forwardRef<any, any>((props, _ref) => {
  return (
    <View style={[styles.mapPlaceholder, props.style]}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>Map Preview (Mobile Only)</Text>
      <Text style={styles.subtitle}>
        MapLibre native tiles are rendered on Android & iOS.
      </Text>
      {props.children}
    </View>
  );
});
Map.displayName = 'MapMock';

export const MapView = Map;

export const Camera = React.forwardRef<any, any>((_props, ref) => {
  React.useImperativeHandle(ref, () => ({
    setCamera: () => {},
    moveTo: () => {},
    zoomTo: () => Promise.resolve(),
    flyTo: () => Promise.resolve(),
    easeTo: () => Promise.resolve(),
    fitBounds: () => Promise.resolve(),
    jumpTo: () => Promise.resolve(),
    setStop: () => Promise.resolve(),
  }));
  return null;
});
Camera.displayName = 'CameraMock';

export const RasterSource = ({ children }: any) => <>{children}</>;
export const Layer = () => null;
export const GeoJSONSource = ({ children }: any) => <>{children}</>;
export const Marker = ({ children, style }: any) => (
  <View style={style}>{children}</View>
);
export const PointAnnotation = ({ children, style }: any) => (
  <View style={style}>{children}</View>
);
export const Callout = ({ children }: any) => <View>{children}</View>;

export type CameraRef = any;

const styles = StyleSheet.create({
  mapPlaceholder: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default {
  LogManager,
  Map,
  MapView,
  Camera,
  RasterSource,
  Layer,
  GeoJSONSource,
  Marker,
  PointAnnotation,
  Callout,
};
