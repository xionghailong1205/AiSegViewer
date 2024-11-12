import React, { ReactNode } from 'react'
import Button from './component/button'
import { AiSegHelperButton } from '@/ButtonFactory/group1/AiSegHelper'
import { ToolButton } from '@/ButtonFactory/ButtonClass'
import clsx from 'clsx'

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
                </ButtonList>
            </div>
        </div>
    )
}

const SegList = () => {
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
                    padding: "10px 0px",
                    background: "#cac1c18a",
                    borderRadius: "5px"
                }}
            >
                <ButtonList>
                    <SidebarButton
                        tool={AiSegHelperButton}
                    />
                </ButtonList>
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
            <Button
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

export default Sidebar