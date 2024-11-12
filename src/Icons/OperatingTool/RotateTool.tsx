import { SvgProp } from '../Types/SvgProp'

const RotateTool = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            fill="none"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.788 10.923h6.923V4"
                />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M22.185 10.923a9.23 9.23 0 1 0-1.49 8.834"
                />
            </g>
        </svg>
    )
}

export default RotateTool