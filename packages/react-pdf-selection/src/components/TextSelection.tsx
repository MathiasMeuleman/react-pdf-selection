import React from "react";
import { TextSelectionWithCSSProperties } from "../types";

export type TextSelectionProps<D extends object = {}> = {
    textSelection: TextSelectionWithCSSProperties<D>;
};

export const TextSelection = ({ textSelection }: TextSelectionProps) => {
    const {color = "#ffe28f", position } =textSelection;
    return (
    <div>
        {position.rects.map((rect, i) => (
            <div
                key={i}
                style={{
                    ...rect,
                    cursor: "pointer",
                    position: "absolute",
                    background: color,
                    mixBlendMode: "multiply",
                    transition: "background 0.3s",
                }}
           />
        ))}
    </div>
)};
