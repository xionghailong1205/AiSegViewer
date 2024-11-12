import { SvgProp } from '../Types/SvgProp'

const CrosshairIcon = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            fill="none"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <g
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    transform="translate(3 3)"
                >
                    <path d="M11 0v6M0 11h6m5 11v-6m11-5h-6" />
                    <circle cx={11.001} cy={11.001} r={2} />
                </g>
            </g>
        </svg>
    )
}

export default CrosshairIcon