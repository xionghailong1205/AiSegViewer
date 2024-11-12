import { useEffect, useRef, useState } from "react"

import { Enums, Types, metaData, utilities as coreUtilities } from "@cornerstonejs/core";
import { registerMouseClickEventShowContextMenu } from "./utils/registerMouseClickEventShowContextMenu";

const registerScrollEventListener = (viewportElement: HTMLDivElement, updateImageSliceData: Function) => {
    const handleScroll = (e: Event) => {
        const event = e as Types.EventTypes.VolumeNewImageEvent

        const imageIdIndex = event.detail.imageIndex

        updateImageSliceData(imageIdIndex + 1)
    }
    viewportElement.addEventListener(Enums.Events.VOLUME_NEW_IMAGE, handleScroll)

    return () => {
        viewportElement.removeEventListener(Enums.Events.VOLUME_NEW_IMAGE, handleScroll)
    }
}

const DicomViewport = ({ viewprotId }: {
    viewprotId: string
}) => {
    const [currentSlice, setCurrentSlice] = useState(0)

    const ViewportContainer = useRef<HTMLDivElement>(null!)

    useEffect(() => {
        return registerScrollEventListener(ViewportContainer.current, setCurrentSlice)
    }, [])

    useEffect(() => {
        return registerMouseClickEventShowContextMenu(ViewportContainer.current)
    }, [])

    return (
        <div
            style={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                border: "1px solid gray"
            }}
        >
            <div
                id={viewprotId}
                style={{
                    width: "100%",
                    height: "100%",
                    flex: 1
                }}
                onContextMenu={(e) => {
                    e.preventDefault()
                }}
                ref={ViewportContainer}
            >

            </div>
            <div
                style={{
                    height: "30px",
                    backgroundColor: "#aaa5a566",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center"
                }}
            >
                <div
                    style={{
                        paddingRight: "10px"
                    }}
                >
                    {currentSlice}
                </div>
            </div>
        </div>
    )
}

export default DicomViewport