import React, { type InputHTMLAttributes } from "react";
import { Input } from "./search-input.styled";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

const SearchInput = (props: SearchInputProps) => {
	return <Input {...props} />;
};

export default SearchInput;
