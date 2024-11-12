import { SvgProp } from '../Types/SvgProp'

const Arrow = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            {...props}>
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12.593 23.642H4v-8.593m0 8.593L23.642 4"
                />
            </g>
        </svg>
    )
}

export default Arrow