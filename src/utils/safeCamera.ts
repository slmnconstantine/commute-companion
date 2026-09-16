import type { CameraRef } from '@maplibre/maplibre-react-native';

/**
 * Wraps CameraRef methods with automatic promise error suppression.
 * In MapLibre React Native, camera animation methods (easeTo, flyTo, fitBounds)
 * return native Promises that reject if the native view is unmounted or during
 * screen transitions, causing "reactTag resolved to view null" unhandled rejections.
 */
export function safeCamera(camera: CameraRef | null | undefined) {
  if (!camera) return null;

  const catchPromise = (result: any) => {
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        // Ignored: native view unmounted or tag resolution during screen transition
      });
    }
    return result;
  };

  return {
    easeTo: (options: Parameters<CameraRef['easeTo']>[0]) => {
      try {
        return catchPromise((camera as any).easeTo(options));
      } catch (err) {
        // Suppress synchronous call errors on unmounted views
      }
    },
    flyTo: (options: Parameters<CameraRef['flyTo']>[0]) => {
      try {
        return catchPromise((camera as any).flyTo(options));
      } catch (err) {
        // Suppress synchronous call errors on unmounted views
      }
    },
    fitBounds: (
      bounds: Parameters<CameraRef['fitBounds']>[0],
      options?: Parameters<CameraRef['fitBounds']>[1]
    ) => {
      try {
        return catchPromise((camera as any).fitBounds(bounds, options));
      } catch (err) {
        // Suppress synchronous call errors on unmounted views
      }
    },
    jumpTo: (options: Parameters<CameraRef['jumpTo']>[0]) => {
      try {
        return catchPromise((camera as any).jumpTo(options));
      } catch (err) {
        // Suppress synchronous call errors on unmounted views
      }
    },
    zoomTo: (
      zoom: Parameters<CameraRef['zoomTo']>[0],
      options?: Parameters<CameraRef['zoomTo']>[1]
    ) => {
      try {
        return catchPromise((camera as any).zoomTo(zoom, options));
      } catch (err) {
        // Suppress synchronous call errors on unmounted views
      }
    },
    setStop: (stop: Parameters<CameraRef['setStop']>[0]) => {
      try {
        return catchPromise(camera.setStop(stop));
      } catch (err) {
        // Suppress synchronous call errors on unmounted views
      }
    },
  };
}
