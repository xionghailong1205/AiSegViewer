import { SvgProp } from '../Types/SvgProp'

const ScrollTool = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 28 28"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <rect
                    width={14.286}
                    height={14.286}
                    x={4}
                    y={9.714}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    rx={2}
                />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    d="M7.01 6.857h11.98a2 2 0 0 1 2 2v12.286h0"
                />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    d="M9.714 4h11.982a2 2 0 0 1 2 2v12.286h0"
                />
            </g>
        </svg>
    )
}

export default ScrollTool