import { SvgProp } from '../Types/SvgProp'

const ZoomTool = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" {...props}>
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <ellipse
                    cx={11.558}
                    cy={12.091}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    rx={7.814}
                    ry={7.636}
                />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="m17.419 17.818 5.86 5.727"
                />
            </g>
        </svg>
    )
}

export default ZoomTool