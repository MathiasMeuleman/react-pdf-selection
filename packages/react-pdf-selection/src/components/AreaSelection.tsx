import React from "react";
import { AreaSelectionType } from "./PdfViewer";

export const AreaSelection = ({ areaSelection }: { areaSelection: AreaSelectionType }) => (
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
