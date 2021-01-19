import React from "react";
import { TextSelectionWithCSSProperties } from "../types";

export type TextSelectionProps<D extends object = {}> = {
    textSelection: TextSelectionWithCSSProperties<D>;
};

export const TextSelection = ({ textSelection }: TextSelectionProps) => (
    <div>
        {textSelection.position.rects.map((rect, i) => (
            <div
                key={i}
                style={{
                    ...rect,
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
