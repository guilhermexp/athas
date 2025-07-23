import type React from "react";
import { createContext, useContext, useMemo } from "react";

export type LayerType = "base" | "decoration" | "selection" | "overlay";

export interface Layer {
  type: LayerType;
  zIndex: number;
  children: React.ReactNode;
}

interface LayerContextValue {
  registerLayer: (type: LayerType, zIndex: number) => void;
  unregisterLayer: (type: LayerType) => void;
  getZIndex: (type: LayerType) => number;
}

const LayerContext = createContext<LayerContextValue | null>(null);

export const useLayerContext = () => {
  const context = useContext(LayerContext);
  if (!context) {
    throw new Error("useLayerContext must be used within LayerProvider");
  }
  return context;
};

interface LayerProviderProps {
  children: React.ReactNode;
}

const DEFAULT_Z_INDICES: Record<LayerType, number> = {
  base: 0,
  decoration: 10,
  selection: 20,
  overlay: 30,
};

export const LayerProvider: React.FC<LayerProviderProps> = ({ children }) => {
  const layerRegistry = useMemo(() => new Map<LayerType, number>(), []);

  const value = useMemo<LayerContextValue>(
    () => ({
      registerLayer: (type, zIndex) => {
        layerRegistry.set(type, zIndex);
      },
      unregisterLayer: type => {
        layerRegistry.delete(type);
      },
      getZIndex: type => {
        return layerRegistry.get(type) ?? DEFAULT_Z_INDICES[type];
      },
    }),
    [layerRegistry],
  );

  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>;
};

interface EditorLayerProps {
  type: LayerType;
  children: React.ReactNode;
  className?: string;
}

export const EditorLayer: React.FC<EditorLayerProps> = ({ type, children, className = "" }) => {
  const { getZIndex } = useLayerContext();
  const zIndex = getZIndex(type);

  return (
    <div
      className={`editor-layer editor-layer-${type} ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        pointerEvents: type === "overlay" || type === "decoration" ? "none" : "auto",
      }}
    >
      {children}
    </div>
  );
};

interface EditorLayersProps {
  children: React.ReactNode;
}

export const EditorLayers: React.FC<EditorLayersProps> = ({ children }) => {
  return (
    <LayerProvider>
      <div
        className="editor-layers"
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        {children}
      </div>
    </LayerProvider>
  );
};
