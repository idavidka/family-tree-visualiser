import tw from "tailwind-styled-components";

export const Container = tw.div`
    bg-red-100
    border
    border-red-400
    text-red-700
    px-4 
    py-3 
    rounded 
    absolute
    bottom-2
    right-2
    animate-bounce
    z-[1100]
`;

export const Title = tw.div`
    font-bold
`;

export const Message = tw.div`
    block
    sm:inline
`;
