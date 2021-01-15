import React, {ReactElement, useState} from "react";
import { NormalizedSelection, PdfViewer } from "react-pdf-selection";
import { pdfs } from "./example-pdfs";
import { SelectionTooltip } from "./SelectionTooltip";

import "./App.css";

const Viewer = ({ document }: { document: ReactElement }) => {
    return (
        <div style={{display: "flex", flexDirection: "row"}}>
            <div style={{width: "60%"}}>
                {document}
            </div>
            <div style={{width: "40%"}}>
                Sidebar
            </div>
        </div>
    );
};

const App = () => {
    const [pdfIdx, setPdfIdx] = useState(0);
    const [selection, setSelection] = useState<NormalizedSelection>();
    const [areaSelectionActive, setAreaSelectionActive] = useState(false);
    const [scale, setScale] = useState(1.2);
    const toggleUrl = () => setPdfIdx(pdfIdx > 0 ? 0 : 1);

    const setAndLogSelection = (highlightTip?: NormalizedSelection) => {
        console.log(highlightTip);
        setSelection(highlightTip);
    };

    return (
        <div className="app-container">
            <div className="wrapper">
                <div className="pdf-viewer">
                    <PdfViewer
                        url={pdfs[pdfIdx].url}
                        selections={pdfs[pdfIdx].selections}
                        enableAreaSelection={() => areaSelectionActive}
                        scale={scale}
                        onTextSelection={setAndLogSelection}
                        onAreaSelection={setAndLogSelection}
                    >
                        {Viewer}
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
                    <button onClick={() => setAreaSelectionActive(!areaSelectionActive)}>{areaSelectionActive ? "On" : "Off"}</button>
                    <button onClick={() => setScale(1.6)}>Scale</button>
                </div>
            </div>
        </div>
    );
};

export default App;
