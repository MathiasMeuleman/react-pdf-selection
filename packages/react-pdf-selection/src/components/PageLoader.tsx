import React from "react";
import "../style/spinner.css";

export const PageLoader = () => (
    <div style={{ height: "100%", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="lds-spinner">
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
        </div>
    </div>
);
