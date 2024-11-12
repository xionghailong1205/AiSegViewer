import { SvgProp } from '../Types/SvgProp'

const Rectangle = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.65}
                    d="M19.606 15.5v7.576m3.788-3.788h-7.576"
                />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    d="M12.03 19.288H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h13.892a2 2 0 0 1 2 2v4.506h0"
                />
            </g>
        </svg>
    )
}

export default Rectangle