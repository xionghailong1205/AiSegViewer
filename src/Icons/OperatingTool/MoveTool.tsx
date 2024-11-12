import { SvgProp } from '../Types/SvgProp'

const MoveTool = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 26 26"
            fill="none"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M0 0h28v28H0z" />
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.882 22.529V4m8.647 9.882H5.235m6.177-7.414L13.88 4l2.484 2.484m0 14.826-2.468 2.468-2.484-2.484m-4.944-4.93L4 13.896l2.484-2.484m14.826 0 2.468 2.468-2.484 2.484"
                />
            </g>
        </svg>
    )
}

export default MoveTool