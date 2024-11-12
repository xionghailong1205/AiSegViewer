import { SvgProp } from '../Types/SvgProp'

const RotateLeft = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            fill="none"
            {...props}
        >
            <g clipPath="url(#clip0_5_9)">
                <path
                    d="M6 13H16.444C17.5486 13 18.444 13.8954 18.444 15V22.111C18.444 23.2156 17.5486 24.111 16.444 24.111H6C4.89543 24.111 4 23.2156 4 22.111V15C4 13.8954 4.89543 13 6 13Z"
                    fill="white" />
                <path
                    d="M15.111 6.33301H19.556C20.1397 6.33301 20.7176 6.44799 21.2569 6.67138C21.7961 6.89478 22.2861 7.22221 22.6987 7.63498C23.1114 8.04775 23.4387 8.53777 23.662 9.07705C23.8853 9.61634 24.0001 10.1943 24 10.778V15.222"
                    stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.444 3L15.111 6.333L18.444 9.667" stroke="white" strokeWidth="1.5" strokeLinecap="round"
                    strokeLinejoin="round" />
            </g>
            <defs>
                <clipPath id="clip0_5_9">
                    <rect width="28" height="28" fill="white" transform="matrix(-1 0 0 1 28 0)" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default RotateLeft