import { SvgProp } from '../Types/SvgProp'

const Spline = (props: SvgProp) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 26 28"
            {...props}
        >
            <g fill="none" fillRule="evenodd">
                <path d="M-3-2h32v32H-3z" />
                <path
                    fill="#D8D8D8"
                    fillRule="nonzero"
                    d="m15.322 3.108 6.342 6.21c.224.22.313.544.232.85l-2.241 8.445a.863.863 0 0 1-.604.612L2.79 23.72c3.648 2.53 6.937 3.152 9.92 1.942l.402-.167c.484-.203.953-.413 1.476-.657l2.043-.977c1.28-.602 2.132-.923 3.02-1.086 1.904-.35 3.7.162 5.976 1.75.39.272.49.813.22 1.208a.852.852 0 0 1-1.193.223c-1.93-1.348-3.282-1.731-4.698-1.473-.431.08-1.54.528-2.705 1.03l-1.806.803c-.986.449-1.724.8-1.692.79l-.404.168C9.345 28.9 4.977 27.782.324 24.033a.888.888 0 0 1-.24-.307l-.014-.037a.852.852 0 0 1-.014-.64L6.149 5.53a.862.862 0 0 1 .59-.55l7.767-2.087a.85.85 0 0 1 .816.214Zm-.845 1.591L7.617 6.54 2.846 20.252l6.922-6.277a2.896 2.896 0 0 1-.269-1.037l-.008-.207a2.88 2.88 0 0 1 2.107-2.785 2.836 2.836 0 0 1 3.206 1.33 2.913 2.913 0 0 1-.43 3.481 2.825 2.825 0 0 1-3.432.49l-7.009 6.352 14.193-3.918 1.983-7.47-5.628-5.512h-.003Zm3.795-4.42L25.07 7.08c.337.337.34.888.007 1.23a.852.852 0 0 1-1.215.007l-6.795-6.805A.875.875 0 0 1 16.81.66a.863.863 0 0 1 .618-.633c.306-.08.63.016.844.25Z"
                />
            </g>
        </svg>
    )
}

export default Spline