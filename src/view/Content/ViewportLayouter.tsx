import React from 'react'
import DicomViewport from './DicomViewport'

const ViewportLayouter = () => {
    let LayoutStyle: React.CSSProperties = {
        gridTemplateAreas: ` 
            'v5001 v5002'
            'v5003 v5004'
        `,
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr"
    }
    let containerNumber = 4

    const containerIdList = Array.from({ length: containerNumber }, (_, i) => i + 5001).map(containerNumber => {
        return `v${containerNumber}`
    })

    return (
        <div
            style={{
                height: "100%",
                overflow: "hidden",
                display: "grid",
                // gridColumnGap: "2px",
                // gridGap: "2px",
                // ...prop.style,
                ...LayoutStyle
            }}
            id='viewportLayouter'
        >
            {
                containerIdList.map((containerId) => {
                    return (
                        <DicomViewport
                            viewprotId={containerId}
                        />
                    )
                })
            }
        </div>
    )
}

export default ViewportLayouter