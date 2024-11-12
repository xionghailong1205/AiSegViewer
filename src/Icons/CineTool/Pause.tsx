import { SvgProp } from '../Types/SvgProp'

const Pause = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 18 21"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M-7-4.76h32v30.462H-7z" />
                <g fill="#D8D8D8">
                    <rect width={7} height={20.942} rx={1} />
                    <rect width={7} height={20.942} x={11} rx={1} />
                </g>
            </g>
        </svg>
    )
}

export default Pause