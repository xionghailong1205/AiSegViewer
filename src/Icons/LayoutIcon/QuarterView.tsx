import { SvgProp } from "../Types/SvgProp"

const QuarterView = (props: SvgProp) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        {...props}
    >
        <g fill="none" fillRule="evenodd" transform="translate(-9 -9)">
            <rect width={38} height={38} rx={4} />
            <g
                fill="#FFF"
                fillRule="nonzero"
                stroke="#FFF"
                strokeLinejoin="round"
                strokeWidth={2}
            >
                <path d="M16 10h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1ZM16 21h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1ZM27 10h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1ZM27 21h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1Z" />
            </g>
        </g>
    </svg>
)
export default QuarterView