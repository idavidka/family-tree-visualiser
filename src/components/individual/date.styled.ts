import styled from 'styled-components';
import tw from 'tailwind-styled-components';

export const Date = styled(tw.div`
    font-normal
    text-xs
    text-white
    transition-colors
    duration-500
    group-hover:text-gray-900
    group-[.on-stage]:invisible
`)``;