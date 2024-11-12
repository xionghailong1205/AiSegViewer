import { SvgProp } from '../Types/SvgProp'

const Length = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 21 21"
            {...props}
        >
            <g fill="none" fillRule="evenodd" opacity={0.8}>
                <path d="M-5.627-6.056h32v32h-32z" />
                <g stroke="#FFF" transform="rotate(45 8.485 20.485)">
                    <rect width={4} height={1} x={0.5} y={0.5} fill="none" rx={0.5} />
                    <rect width={4} height={1} x={0.5} y={23.5} fill="none" rx={0.5} />
                    <path strokeWidth={1.5} d="M2.5 23V0" />
                </g>
            </g>
        </svg>
    )
}

export default Length