import React from "react";
import {boundingRectToStyle, Dimensions} from "../utils";
import { AreaSelectionType } from "./PdfViewer";

export const AreaSelection = ({ areaSelection, dimensions }: { areaSelection: AreaSelectionType; dimensions: Dimensions }) => (
    <div
        style={{
            ...boundingRectToStyle(areaSelection.position.boundingRect, dimensions),
            position: "absolute",
            border: "1px dashed #333",
            background: "rgba(252, 232, 151, 1)",
            mixBlendMode: "multiply",
        }}
    />
);
