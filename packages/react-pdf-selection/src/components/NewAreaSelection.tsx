import React from "react";
import { BoundingRectWithCSSProperties } from "../types";

export type NewAreaSelectionProps = {
    boundingRect: BoundingRectWithCSSProperties;
};

export const NewAreaSelection = ({ boundingRect }: NewAreaSelectionProps) => (
    <div
        style={{
            ...boundingRect,
            position: "absolute",
            border: "1px dashed #333",
            background: "rgba(252, 232, 151, 1)",
            mixBlendMode: "multiply",
        }}
    />
);
