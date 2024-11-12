import { SvgProp } from "../Types/SvgProp"

const SingleView = (props: SvgProp) => (
    <svg
        viewBox="0 0 28 28"
        fill="none"
        {...props}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g>
            <mask id="mask0_1_7" maskUnits="userSpaceOnUse" x="0" y="0" width="28" height="28">
                <path d="M28 0H0V28H28V0Z" fill="white" />
            </mask>
            <g mask="url(#mask0_1_7)">
                <path
                    d="M25 1.55556H3C1.89543 1.55556 1 2.94845 1 4.66667V22.7111C1 24.4294 1.89543 25.8222 3 25.8222H25C26.1046 25.8222 27 24.4294 27 22.7111V4.66667C27 2.94845 26.1046 1.55556 25 1.55556Z"
                    stroke="white" />
            </g>
        </g>
    </svg>
)
export default SingleView