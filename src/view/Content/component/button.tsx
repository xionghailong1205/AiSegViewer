import { ToolButton } from '@/ButtonFactory/ButtonClass'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/view/ui/tooltip'

const IconButton = (
    {
        tool
    }: {
        tool: ToolButton
    }
) => {
    // 我们需要在这个位置做一些更改
    const Icon = tool.iconComponent

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* 我们这里需要设置一个 div 容器 */}
                    <button
                        style={{
                            width: "25px",
                            aspectRatio: "1/1",
                        }}
                    >
                        <Icon />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                        {tool.label}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export default IconButton