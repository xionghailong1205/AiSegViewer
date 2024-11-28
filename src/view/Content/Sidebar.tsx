import React, { ReactNode, useEffect } from 'react'
import IconButton from './component/button'
import { AiSegHelperButton } from '@/ButtonFactory/group1/AiSegHelper'
import { ToolButton } from '@/ButtonFactory/ButtonClass'
import clsx from 'clsx'
import Segmentation from '@/Icons/AnnotationTool/segmentation'
import { Button } from '@/ui/button'
import { SegInfo, useSegListService } from '@/store/useSegListService'
import { getSEGService } from '@/service/segService'
import { Spinner } from '@/ui/spinner'
import { useToast } from '@/hooks/use-toast';
import { WindowLevelToolButton } from '@/ButtonFactory/group1/WindowLevel'

const Sidebar = () => {
    return (
        <div
            style={{
                height: "100%",
                backgroundColor: "#82818169",
                padding: "10px 5px"
            }}
        >
            <ToolGroup />
            <SegList />
        </div>
    )
}

const ToolGroup = () => {
    return (
        <div>
            <div
                style={{
                    textAlign: "center",
                    fontSize: "17px",
                    color: "#1066e3",
                    fontWeight: 600
                }}
            >
                工具组
            </div>
            <div
                style={{
                    border: "1px solid gray",
                    padding: "10px 0px",
                    background: "#cac1c18a",
                    borderRadius: "5px"
                }}
            >
                <ButtonList>
                    <SidebarButton
                        tool={AiSegHelperButton}
                    />
                    <SidebarButton
                        tool={WindowLevelToolButton}
                    />
                </ButtonList>
            </div>
        </div>
    )
}

const SegList = () => {
    const segList = useSegListService(state => state.segList)

    return (
        <div
            style={{
                marginTop: "5px"
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    fontSize: "17px",
                    color: "#1066e3",
                    fontWeight: 600
                }}
            >
                切割列表
            </div>
            <div
                style={{
                    border: "1px solid gray",
                    padding: "10px 10px",
                    background: "#cac1c18a",
                    borderRadius: "5px"
                }}
            >
                {
                    segList.map(segInfo => {
                        return (
                            <SegInfoBox
                                {...segInfo}
                            />
                        )
                    })
                }
            </div>
        </div>
    )
}

const SidebarButton = ({
    tool
}: {
    tool: ToolButton
}) => {
    const result = clsx({ 'bg-[#ffffff96]': false })

    return (
        <div
            className={` hover:bg-[#63c8f0d6] active:bg-[#55c1eb92] bg-[#6dc9ed92] ${result}`}
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "45px",
                aspectRatio: "1/1",
                borderRadius: "5px"
            }}
            onClick={() => {
                tool.clickhandler()
            }}
        >
            <IconButton
                tool={tool}
            />
        </div>
    )
}

const ButtonList = ({
    children
}: {
    children: ReactNode
}) => {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                justifyItems: "center"
            }}
        >
            {children}
        </div>
    )
}

const SegInfoBox = ({
    segId,
    status
}: SegInfo) => {
    const { toast } = useToast()

    switch (status) {
        case ("compelete"): {
            return (
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        padding: "10px 5px",
                        border: "1px dotted gray",
                        justifyContent: "center"
                    }}
                >
                    <div
                        className='center'
                    >
                        <Segmentation
                            style={{
                                height: "30px",
                                width: "30px"
                            }}
                        />
                    </div>
                    <div
                        style={{
                            flex: 1,
                        }}
                        className='center'
                    >
                        <div
                            style={{
                                overflow: "hidden",
                                maxHeight: "50px",
                                wordBreak: "break-all"
                            }}
                        >
                            {segId}
                        </div>
                    </div>
                    <div
                        className='center'
                    >
                        <Button
                            onClick={() => {
                                useSegListService.getState().removeSeg(segId)
                                getSEGService().removeSeg(segId).then(message => {
                                    toast({
                                        title: "删除切割结果",
                                        description: message,
                                    })
                                })
                            }}
                            style={{
                                padding: "0px",
                                height: "40px",
                                width: "40px"
                            }}
                        >
                            <svg viewBox="0 0 15 15"
                                style={{
                                    height: "20px",
                                    width: "20px"
                                }}
                                fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H5H10H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4L3.5 4C3.22386 4 3 3.77614 3 3.5ZM5 4H10V12H5V4Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                                </path>
                            </svg>
                        </Button>
                    </div>
                </div >
            )
        }
        case ("processing"): {
            return (
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        padding: "10px 5px",
                        border: "1px dotted gray",
                        justifyContent: "center"
                    }}
                >
                    <div
                        className='center'
                    >
                        <Spinner />
                    </div>
                    <div
                        style={{
                            flex: 1,
                        }}
                        className='center'
                    >
                        <div
                            style={{
                                overflow: "hidden",
                                maxHeight: "50px",
                                wordBreak: "break-all"
                            }}
                        >
                            {`Processing: ${segId}`}
                        </div>
                    </div>
                </div >
            )
        }
        case ("loading"): {
            return (
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        padding: "10px 5px",
                        border: "1px dotted gray",
                        justifyContent: "center"
                    }}
                >
                    <div
                        className='center'
                    >
                        <Spinner />
                    </div>
                    <div
                        style={{
                            flex: 1,
                        }}
                        className='center'
                    >
                        <div
                            style={{
                                overflow: "hidden",
                                maxHeight: "50px",
                                wordBreak: "break-all"
                            }}
                        >
                            {`Loading: ${segId}`}
                        </div>
                    </div>
                </div >
            )
        }
    }
}

export default Sidebar