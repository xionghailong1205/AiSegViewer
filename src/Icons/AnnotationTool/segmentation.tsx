import { SvgProp } from '../Types/SvgProp'

const Segmentation = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 28"
            {...props}
        >
            <g fill="none" fillRule="evenodd" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="m18.857 16.217 2.497-2.497 2.497 2.497m-4.994 4.006 2.497 2.497 2.497-2.497"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21.89 6.56 11.83 16.622a.67.67 0 0 1-.34.181l-3.834.767a.67.67 0 0 1-.787-.787l.767-3.832a.67.67 0 0 1 .183-.341l10.06-10.061a2.83 2.83 0 0 1 4 0l.011.012a2.83 2.83 0 0 1 0 4"
                />
                <path
                    strokeLinecap="square"
                    strokeWidth={1.5}
                    d="m9.609 12.653 2.338 2.338"
                />
                <path
                    fill="currentColor"
                    fillRule="nonzero"
                    d="M5 23.71H3a2.875 2.875 0 0 1-2.875-2.876v-1.438a.875.875 0 1 1 1.75 0v1.438c0 .622.504 1.125 1.125 1.125h2a.875.875 0 0 1 0 1.75ZM.125 15.145v-6.5a.875.875 0 1 1 1.75 0v6.5a.875.875 0 0 1-1.75 0Zm0-10.75V3A2.875 2.875 0 0 1 3 .125h2.043a.875.875 0 1 1 0 1.75H3c-.621 0-1.125.504-1.125 1.125v1.396a.875.875 0 0 1-1.75 0ZM9.293.125h2.234a.875.875 0 1 1 0 1.75H9.293a.875.875 0 0 1 0-1.75Z"
                />
            </g>
        </svg>
    )
}

export default Segmentation