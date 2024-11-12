import { SvgProp } from '../Types/SvgProp'

const Play = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h32v32H0z" />
                <path
                    fill="#D8D8D8"
                    d="M7 2.249V29.75a1.23 1.23 0 0 0 1.894 1.037L30.38 17.037a1.23 1.23 0 0 0 0-2.074L8.894 1.213A1.23 1.23 0 0 0 7 2.248Z"
                />
            </g>
        </svg>
    )
}

export default Play