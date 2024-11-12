import { SvgProp } from '../Types/SvgProp'

const Bidirectional = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            {...props}
        >
            <g fill="none" fillRule="evenodd" opacity={0.8}>
                <path d="M-3.806-4h32v32h-32z" />
                <g stroke="#FFF">
                    <g transform="rotate(45 4.218 23.934)">
                        <rect width={4} height={1} x={0.5} y={0.862} fill="none" rx={0.5} />
                        <rect width={4} height={1} x={0.5} y={21.862} fill="none" rx={0.5} />
                        <path strokeWidth={1.5} d="M2.5 21.362v-21" />
                    </g>
                    <g transform="rotate(-45 4.268 1.768)">
                        <rect width={4} height={1} x={0.5} y={0.5} fill="none" rx={0.5} />
                        <rect width={4} height={1} x={0.5} y={28.5} fill="none" rx={0.5} />
                        <path strokeWidth={1.5} d="M2.5 29V1" />
                    </g>
                </g>
            </g>
        </svg>
    )
}

export default Bidirectional