import React from "react";
import { AreaSelectionWithCSSProperties } from "../types";

export type AreaSelectionProps<D extends object = {}> = {
    areaSelection: AreaSelectionWithCSSProperties<D>;
};

export const AreaSelection = ({ areaSelection }: AreaSelectionProps) => (
    <div
        style={{
            ...areaSelection.position.boundingRect,
            position: "absolute",
            border: "1px dashed #333",
            background: "rgba(252, 232, 151, 1)",
            mixBlendMode: "multiply",
        }}
    />
);
