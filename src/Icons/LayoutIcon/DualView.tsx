
import { SvgProp } from "../Types/SvgProp"

const DualView = (props: SvgProp) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 28"
        fill="none"
        {...props}
    >
        <path
            stroke="white"
            d="M25 1.556H3c-1.105 0-2 1.392-2 3.11v18.045c0 1.718.895 3.111 2 3.111h22c1.105 0 2-1.393 2-3.11V4.666c0-1.719-.895-3.111-2-3.111Z"
        />
        <path
            stroke="white"
            d="M14 1.556H3c-.53 0-1.04.327-1.414.91C1.21 3.05 1 3.843 1 4.667v18.045c0 .825.21 1.617.586 2.2.375.583.884.911 1.414.911h11V1.556Z"
            clipRule="evenodd"
        />
    </svg>
)
export default DualView