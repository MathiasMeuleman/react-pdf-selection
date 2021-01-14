import React from "react";
import { boundingRectToStyle, Dimensions } from "../utils";
import { TextSelectionType } from "./PdfViewer";

export const TextSelection = ({
    textSelection,
    dimensions,
}: {
    textSelection: TextSelectionType;
    dimensions: Dimensions;
}) => (
    <div>
        {textSelection.position.rects.map((rect, i) => (
            <div
                key={i}
                style={{
                    ...boundingRectToStyle(rect, dimensions),
                    cursor: "pointer",
                    position: "absolute",
                    background: "rgba(255, 226, 143, 1)",
                    mixBlendMode: "multiply",
                    transition: "background 0.3s",
                }}
            />
        ))}
    </div>
);
