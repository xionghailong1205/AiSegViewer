import { SvgProp } from '../Types/SvgProp'

const FlipHorizontal = (props: SvgProp) => {
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
                    strokeWidth={1.5}
                    d="M10.632 7.316H6a2 2 0 0 0-2 2v9.263a2 2 0 0 0 2 2h4.632"
                />
                <path
                    stroke="currentColor"
                    strokeDasharray="1,3.1"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    d="M18.368 7.316H23a2 2 0 0 1 2 2v9.263a2 2 0 0 1-2 2h-4.632 0"
                />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    d="M14.5 4.553v18.789"
                />
            </g>
        </svg>
    )
}

export default FlipHorizontal