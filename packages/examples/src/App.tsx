import React, { ReactElement, useCallback, useState } from "react";
import { NormalizedSelection, PdfViewer } from "react-pdf-selection";

import "./App.css";
import { pdfs } from "./example-pdfs";

const Viewer = ({ document }: { document: ReactElement }) => {
    return (
        <div style={{ display: "flex", flexDirection: "row" }}>
            <div style={{ width: "60%" }}>{document}</div>
            <div style={{ width: "40%" }}>Sidebar</div>
        </div>
    );
};

const App = () => {
    const [pdfIdx, setPdfIdx] = useState(0);
    const [selection, setSelection] = useState<NormalizedSelection>();
    const [areaSelectionActive, setAreaSelectionActive] = useState(false);
    const [scale, setScale] = useState(1.2);
    const toggleUrl = () => setPdfIdx(pdfIdx > 0 ? 0 : 1);

    const setAndLogSelection = useCallback(
        (highlightTip?: NormalizedSelection) => {
            console.log(
                highlightTip ? `New ${"image" in highlightTip ? "area" : "text"} selection` : "Reset selection",
            );
            setSelection(highlightTip);
        },
        [setSelection],
    );

    return (
        <div className="app-container">
            <div className="wrapper">
                <div className="pdf-viewer">
                    <PdfViewer
                        url={pdfs[pdfIdx].url}
                        selections={pdfs[pdfIdx].selections}
                        enableAreaSelection={useCallback(() => areaSelectionActive, [areaSelectionActive])}
                        scale={scale}
                        onTextSelection={setAndLogSelection}
                        onAreaSelection={setAndLogSelection}
                    >
                        {({ document }) => <Viewer document={document} />}
                    </PdfViewer>
                </div>
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        zIndex: 99,
                    }}
                >
                    <button onClick={() => toggleUrl()}>Switch document</button>
                    <button onClick={() => setAreaSelectionActive(!areaSelectionActive)}>
                        {areaSelectionActive ? "On" : "Off"}
                    </button>
                    <button onClick={() => setScale(1.6)}>Scale</button>
                </div>
            </div>
        </div>
    );
};

export default App;
