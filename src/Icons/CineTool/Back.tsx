import { SvgProp } from '../Types/SvgProp'

const Back = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 29 28"
            {...props}
        >
            <g
                fill="none"
                fillRule="evenodd"
                transform="matrix(-1 0 0 1 31.023 -1.311)"
            >
                <path d="M0 .154h31.753v30.02H0z" />
                <rect
                    width={3.91}
                    height={16.508}
                    x={27.113}
                    y={7.498}
                    fill="#D8D8D8"
                    rx={0.5}
                />
                <path
                    fill="#D8D8D8"
                    d="m12.295 6 15.966 7.695a2 2 0 0 1 0 3.603l-15.966 7.694a1 1 0 0 1-1.434-.9V6.901A1 1 0 0 1 12.295 6Z"
                />
            </g>
        </svg>
    )
}

export default Back