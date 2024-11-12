import { SvgProp } from '../Types/SvgProp'

const Elliptical = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 25 19"
            {...props}
        >
            <g fill="none" fillRule="evenodd" opacity={0.8}>
                <path d="M-3.5-6.5h32v32h-32z" />
                <g fill="#FFF">
                    <path
                        fillRule="nonzero"
                        d="m10.602 15.869-.017.053a2 2 0 0 0 .126 1.473c-4.375-.52-7.883-2.919-8.907-6.02a1.995 1.995 0 0 0 1.576-.078c.97 2.259 3.722 4.08 7.222 4.572ZM22.5 11.5c.244 0 .478-.044.695-.124-1.023 3.1-4.53 5.498-8.907 6.019a1.998 1.998 0 0 0 .11-1.527c3.5-.49 6.251-2.312 7.223-4.573.265.132.563.205.879.205Zm-12-9c0 .22.036.433.102.632-3.5.491-6.251 2.312-7.223 4.573a1.996 1.996 0 0 0-1.575-.08c1.024-3.101 4.532-5.5 8.908-6.02-.136.27-.212.573-.212.895Zm12.658 5.014.037.11a1.996 1.996 0 0 0-1.575.08c-.97-2.26-3.722-4.081-7.222-4.573a1.992 1.992 0 0 0-.109-1.526c4.323.514 7.799 2.862 8.87 5.909Z"
                    />
                    <circle cx={2.5} cy={9.5} r={2} fill="none" stroke="#FFF" />
                    <circle cx={22.5} cy={9.5} r={2} fill="none" stroke="#FFF" />
                    <circle cx={12.5} cy={2.5} r={2} fill="none" stroke="#FFF" />
                    <circle cx={12.5} cy={16.5} r={2} fill="none" stroke="#FFF" />
                </g>
            </g>
        </svg>
    )
}

export default Elliptical