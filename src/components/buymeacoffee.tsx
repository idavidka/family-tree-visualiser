import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import tw from "tailwind-styled-components";

const CoffeeTWButton = tw.a`
    bg-blue-500
    hover:bg-blue-700 
    text-white 
    font-bold 
    text-xs
    py-2 
    px-2 
    mx-1
    rounded-md
    h-[32px]
`;

const CoffeeButton = styled(CoffeeTWButton)`
	color: #000000;
	background-color: #ffdd00;
`;

function Coffee({ className }: { className?: string }) {
	const { t } = useTranslation();
	return (
		<CoffeeButton
			className={className}
			target="_blank"
			href="https://www.buymeacoffee.com/idavid"
		>
			<span className="icon">🍕</span>
			<span>{t("Buy me a pizza")}</span>
		</CoffeeButton>
	);
}

export default Coffee;
