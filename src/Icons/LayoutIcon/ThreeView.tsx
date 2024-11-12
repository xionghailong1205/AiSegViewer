import { SvgProp } from "../Types/SvgProp"

const ThreeView = (props: SvgProp) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 38 38"
        {...props}
    >
        <g fill="none" fillRule="evenodd">
            <path d="M39 0H1v38h38z" />
            <g fill="#FFF" transform="matrix(-1 0 0 1 38 0)">
                <rect width={17.1} height={38} x={20.9} rx={3.8} />
                <rect width={17.1} height={17.1} rx={3.8} />
                <rect width={17.1} height={17.1} y={20.9} rx={3.8} />
            </g>
        </g>
    </svg>
)
export default ThreeView