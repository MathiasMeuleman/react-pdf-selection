import React from "react";
import {Position} from "./PdfViewer";

export const AreaSelection = ({position}: {position: Position}) => (
    <div
        style={{
            position: "absolute",
            border: "1px dashed #333",
            background: "rgba(252, 232, 151, 1)",
            mixBlendMode: "multiply",
            ...position.boundingRect,
            top: position.pageOffset + position.boundingRect.top,
        }}
    />
);
