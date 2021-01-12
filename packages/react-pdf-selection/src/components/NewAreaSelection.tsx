import React from "react";
import {NormalizedPosition} from "../types";
import {absoluteBoundingRectToStyle} from "../utils";

export const NewAreaSelection = ({ position }: { position: NormalizedPosition }) => (
    <div
        style={{
            ...absoluteBoundingRectToStyle(position.absolute.boundingRect),
            position: "absolute",
            border: "1px dashed #333",
            background: "rgba(252, 232, 151, 1)",
            mixBlendMode: "multiply",
        }}
    />
);
