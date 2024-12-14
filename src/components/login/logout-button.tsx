import React, { useCallback } from "react";
import { useDispatch } from "react-redux";
import { actions } from "../../store/main/reducers";
import { Button } from "../button/button.styled";
import { useTranslation } from "react-i18next";

export default function LogoutButton() {
	const { t } = useTranslation();
	const dispatch = useDispatch();

	const logout = useCallback(() => {
		dispatch(actions.logout());
	}, [dispatch]);

	return (
		<Button onClick={logout} className="m-0">
			{t("Logout")}
		</Button>
	);
}
