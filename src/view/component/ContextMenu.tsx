// shadcn 中的组件无法满足我们的需求
import { ControlledMenu, MenuItem } from '@szhsin/react-menu';
import { annotation } from '@cornerstonejs/tools';
import { useContextMenuService } from '@/store/useContextMenuService';

const closeContextMenu = useContextMenuService.getState().closeContextMenu
const removeSelectedAnnotation = useContextMenuService.getState().removeSelectedAnnotation

export const ContextMenu = () => {
    const status = useContextMenuService(state => state.status)
    const anchorPosition = useContextMenuService(state => state.anchorPosition)

    return (
        <ControlledMenu
            // 这样的话我们就能用鼠标事件的 pageX 、pageY
            anchorPoint={anchorPosition}
            state={status}
            direction="right"
            onClose={() => {
                closeContextMenu()
            }}
            className="w-max"
        >
            <MenuItem
                className="bg-[#293245] w-[130px] outline-none text-white py-[10px] px-[15px] hover:bg-[#3159d6]"
                onClick={() => {
                    removeSelectedAnnotation()
                }}
            >
                删除标注
            </MenuItem>
            <AiSegButton />
        </ControlledMenu>
    )
}

const AiSegButton = () => {
    // 判断是否右击了 rec ai helper 
    const isRecAiHelper = (() => {
        const annotationId = useContextMenuService.getState().idOfSelectedAnnotation
        const annotationManager = annotation.state.getAnnotationManager()
        const annotaitonClicked = annotationManager.getAnnotation(annotationId)
        console.log(annotaitonClicked)

        return annotaitonClicked?.metadata.toolName === "RectangleToolForAISeg"
    })()

    return (
        <>
            {
                isRecAiHelper ? (
                    <MenuItem
                        className="bg-[#293245] w-[130px] outline-none text-white py-[10px] px-[15px] hover:bg-[#3159d6]"
                        onClick={() => {
                            // 进行 AI 分割的接口
                            const doAiSeg = useContextMenuService.getState().doAiSeg
                            doAiSeg()
                        }}
                    >
                        进行AI分割
                    </MenuItem>
                ) : ""
            }
        </>
    )
}