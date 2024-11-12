import { SvgProp } from "../Types/SvgProp"

const NineView = (props: SvgProp) => (
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
            d="M10 1.556H3c-.53 0-1.04.327-1.414.91C1.21 3.05 1 3.843 1 4.667v18.045c0 .825.21 1.617.586 2.2.375.583.884.911 1.414.911h7V1.556Z"
            clipRule="evenodd"
        />
        <path
            stroke="white"
            d="M18 1.556H3c-.53 0-1.04.327-1.414.91C1.21 3.05 1 3.843 1 4.667v18.045c0 .825.21 1.617.586 2.2.375.583.884.911 1.414.911h15V1.556Z"
            clipRule="evenodd"
        />
        <path
            stroke="white"
            d="M25 1.556H3c-.53 0-1.04.218-1.414.607A2.114 2.114 0 0 0 1 3.63v6.222h26V3.63c0-.55-.21-1.078-.586-1.467A1.965 1.965 0 0 0 25 1.556ZM3.031 25.926H24.97c.529 0 1.036-.219 1.41-.608.374-.389.584-.916.584-1.466V17.63H1.037v6.222c0 .55.21 1.078.584 1.466.374.39.881.608 1.41.608Z"
            clipRule="evenodd"
        />
    </svg>
)
export default NineView