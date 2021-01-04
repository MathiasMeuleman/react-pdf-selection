import React from "react";
import { Position } from "../types";

export const NewAreaSelection = ({ position }: { position: Position }) => (
    <div
        style={{
            ...position.boundingRect,
            position: "absolute",
            border: "1px dashed #333",
            background: "rgba(252, 232, 151, 1)",
            mixBlendMode: "multiply",
        }}
    />
);
