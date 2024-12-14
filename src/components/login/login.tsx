// eslint-disable max-len
import React, { type ChangeEvent, useCallback, useState } from "react";
import { type AuthState, doAuth, createAuth } from "../../utils/firebase";
import { useDispatch } from "react-redux";
import { actions } from "../../store/main/reducers";
import { Button } from "../button/button.styled";
import { HiGlobe } from "react-icons/hi";
import { useLocale } from "../../translation/useLocale";
import Coffee from "../buymeacoffee";
import { FAKE_USER } from "../../constants/constants";
import { isDevelopment } from "../../utils/get-product-details";

export default function Login() {
	const dispatch = useDispatch();
	const [loginState, setLoginState] = useState<{
		email: string;
		password: string;
	}>({ email: "", password: "" });
	const [authState, setAuthState] = useState<AuthState>();

	const { language, setLanguage, t } = useLocale();

	const setInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		setLoginState((prev) => ({
			...prev,
			[e.target.id]: e.target.value,
		}));
	}, []);

	const authenticate = useCallback(() => {
		if (!loginState.email || !loginState.password) {
			return;
		}

		if (
			isDevelopment() &&
			loginState.email === FAKE_USER.email &&
			loginState.password === FAKE_USER.password
		) {
			dispatch(actions.setUserId(FAKE_USER.userId));
			return;
		}

		setAuthState({});

		doAuth(loginState.email, loginState.password).then((response) => {
			if (response.errorCode === "auth/invalid-login-credentials") {
				createAuth(loginState.email, loginState.password).then(
					(registerResponse) => {
						if (registerResponse.errorCode) {
							setAuthState(response);
						} else {
							dispatch(actions.setUserId(loginState.email));
						}
					}
				);
			} else if (response.errorCode) {
				setAuthState(response);
			} else {
				dispatch(actions.setUserId(loginState.email));
			}
		});
	}, [dispatch, loginState.email, loginState.password]);

	const onKeyUp = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				authenticate();
			}
		},
		[authenticate]
	);

	return (
		<>
			<div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
				<Button
					className="absolute top-5 right-5"
					onClick={() => {
						setLanguage(language === "en" ? "hu" : "en");
					}}
				>
					<div className="flex items-center justify-between">
						<HiGlobe />
						{language === "en" ? "magyar" : "English"}
					</div>
				</Button>
				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
					<h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						{t("Sign in to edit your tree")}
					</h2>
				</div>

				<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
					<form className="space-y-6" action="#" method="POST">
						<div>
							<label
								htmlFor="familyTreeId"
								className="block text-sm font-medium leading-6 text-gray-900"
							>
								{t("E-mail")}
							</label>
							<div className="mt-2">
								<input
									id="email"
									name="email"
									type="email"
									value={loginState?.email}
									onChange={setInput}
									onKeyUp={onKeyUp}
									required
									// eslint-disable-next-line max-len
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								/>
							</div>
						</div>

						<div>
							<div className="flex items-center justify-between">
								<label
									htmlFor="password"
									className="block text-sm font-medium leading-6 text-gray-900"
								>
									{t("Password")}
								</label>
							</div>
							<div className="mt-2">
								<input
									id="password"
									name="password"
									type="password"
									autoComplete="current-password"
									onChange={setInput}
									onKeyUp={onKeyUp}
									required
									// eslint-disable-next-line max-len
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								/>
							</div>
						</div>

						<div>
							<div className="m-2 text-red-500 text-center">
								{authState?.errorCode}
							</div>
							<button
								type="button"
								// eslint-disable-next-line max-len
								className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
								onClick={authenticate}
								disabled={
									!loginState.email || !loginState.password
								}
							>
								{t("Get me in")}
							</button>

							{/* eslint-disable-next-line max-len */}
							<Coffee className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed m-0 mt-2" />
						</div>
					</form>
				</div>
			</div>
		</>
	);
}
