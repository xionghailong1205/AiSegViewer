import { SvgProp } from '../Types/SvgProp'

const InvertTool = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 26 26"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <rect
                    width={20}
                    height={18}
                    x={4}
                    y={5}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    rx={2}
                />
                <path
                    fill="currentColor"
                    d="M14 23H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8v3a6 6 0 1 0 0 12v3Zm0-15a6 6 0 1 1 0 12Z"
                />
            </g>
        </svg>
    )
}

export default InvertTool