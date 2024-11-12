import { SvgProp } from '../Types/SvgProp'

const FlipVertical = (props: SvgProp) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 28"
      fill="none"
      {...props}
    >
      <g stroke="#fff" strokeLinecap="round" strokeWidth={1.5} clipPath="url(#a)">
        <path d="M22 11V6.111c0-.56-.254-1.097-.707-1.493A2.598 2.598 0 0 0 19.587 4H8.413c-.64 0-1.254.222-1.706.618C6.254 5.014 6 5.551 6 6.111V11" />
        <path
          strokeDasharray="1 3.1"
          d="M22 17v4.889c0 .56-.254 1.097-.707 1.493a2.598 2.598 0 0 1-1.706.618H8.413c-.64 0-1.254-.222-1.706-.618-.453-.396-.707-.933-.707-1.493V17"
        />
        <path d="M24 14H4" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M28 0v28H0V0z" />
        </clipPath>
      </defs>
    </svg>
  )
}

export default FlipVertical