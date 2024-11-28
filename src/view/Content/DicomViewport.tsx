import { useEffect, useRef, useState } from "react"

import { Enums, Types, metaData, utilities as coreUtilities } from "@cornerstonejs/core";
import { registerMouseClickEventShowContextMenu } from "./utils/registerMouseClickEventShowContextMenu";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { jumpToSpecificIndex } from "@/utils/jumpToSpecificIndex";

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
    const [jumpIndex, setJumpIndex] = useState(1)

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
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                {
                    viewprotId === "v5001" ? (
                        <div
                            style={{
                                display: "flex",
                                width: "130px",
                            }}
                        >
                            <div

                                style={{
                                    flex: 1
                                }}
                            >
                                <Input
                                    type="number"
                                    style={{
                                        background: "white",
                                        height: "30px"
                                    }}
                                    value={jumpIndex}
                                    onChange={(e) => {
                                        setJumpIndex(Number(e.target.value))
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    flex: 1,
                                }}
                                className="center"
                            >
                                <Button
                                    style={{
                                        padding: "0px 10px",
                                        height: "30px",
                                        color: "#2c2828b5"
                                    }}
                                    className="hover:bg-[#63c8f0d6] active:bg-[#55c1eb92] bg-[#6dc9ed92]"
                                    onClick={() => {
                                        jumpToSpecificIndex(jumpIndex)
                                    }}
                                >
                                    跳转
                                </Button>
                            </div>
                        </div>
                    ) : ""
                }
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