import { SvgProp } from '../Types/SvgProp'

const Probe = (props: SvgProp) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 19 12"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <g fill="#FFF" fillRule="nonzero">
                    <path d="M1.424 4.992h6.288V0h1.424v11.712H7.712v-5.44H1.424v5.44H0V0h1.424zM17.216 3.392h1.36v8.32h-1.2a18.027 18.027 0 0 0-.096-1.36 2.752 2.752 0 0 1-1.136 1.152 3.28 3.28 0 0 1-1.568.384c-.885 0-1.595-.293-2.128-.88-.533-.587-.8-1.419-.8-2.496v-5.12h1.36v4.752c0 .79.157 1.397.472 1.824.315.427.776.64 1.384.64.405 0 .787-.093 1.144-.28.357-.187.648-.467.872-.84.224-.373.336-.832.336-1.376v-4.72Z" />
                </g>
                <path d="M-7-10h32v32H-7z" />
            </g>
        </svg>
    )
}

export default Probe