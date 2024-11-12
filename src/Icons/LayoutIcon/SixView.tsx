import { SvgProp } from "../Types/SvgProp"

const SixView = (props: SvgProp) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 38 38"
        {...props}>
        <g fill="#FFF" fillRule="evenodd" transform="translate(0 2.5)">
            <rect width={11.565} height={14.85} rx={3.304} />
            <rect width={11.565} height={14.85} y={18.15} rx={3.304} />
            <rect width={11.565} height={14.85} x={13.217} rx={3.304} />
            <rect width={11.565} height={14.85} x={13.217} y={18.15} rx={3.304} />
            <rect width={11.565} height={14.85} x={26.435} rx={3.304} />
            <rect width={11.565} height={14.85} x={26.435} y={18.15} rx={3.304} />
        </g>
    </svg>
)
export default SixView