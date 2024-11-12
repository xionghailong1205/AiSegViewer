import { SvgProp } from '../Types/SvgProp'

const RotateRight = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            fill="none"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <rect
                    width={14.444}
                    height={11.111}
                    x={9.556}
                    y={13}
                    fill="currentColor"
                    rx={2}
                />
                <g
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                >
                    <path d="M12.889 6.333H8.444A4.444 4.444 0 0 0 4 10.778v4.444" />
                    <path d="m9.556 3 3.333 3.333-3.333 3.334" />
                </g>
            </g>
        </svg>
    )
}

export default RotateRight