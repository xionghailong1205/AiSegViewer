import { SvgProp } from '../Types/SvgProp'

const Layout = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 26 20"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <g
                    fill="#D8D8D8"
                    fillRule="nonzero"
                    stroke="#D8D8D8"
                    strokeLinejoin="round"
                    strokeWidth={2}
                >
                    <path d="M7 1H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1ZM7 12H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1ZM18 1h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1ZM18 12h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1Z" />
                </g>
                <path d="M-6-6h32v32H-6z" />
                <path fill="#D8D8D8" d="M21.914 18h4l-2 2z" />
            </g>
        </svg>
    )
}

export default Layout