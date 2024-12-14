import { type StepType } from "@reactour/tour";
import React from "react";
import { getGedcomCache } from "../../store/main/selectors";
import store from "../../store/store";
import { type IndiKey } from "../../types/types";
import { Button } from "../button/button.styled";
import { HiGlobe } from "react-icons/hi";
import { actions } from "../../store/main/reducers";
import { value } from "../../store/main/utils";

type OnSelect = (
	e: React.MouseEvent,
	selected: IndiKey,
	source?: "stage" | "sidebar"
) => void;
type OnDone = () => void;

export const stepsHU: (onSelect: OnSelect, onDone: OnDone) => StepType[] = (
	onSelect,
	onDone
) => [
	{
		selector: "body",
		styles: {
			popover: (base) => ({
				...base,
				width: "50vw",
				maxWidth: "50vw",
			}),
		},
		content: (
			<div className="flex flex-col">
				<div className="flex justify-start">
					<Button
						className="w-[100px] flex justify-start items-center gap-2"
						onClick={() => {
							store.dispatch(actions.setLanguage("en"));
							window.location.reload();
						}}
					>
						<HiGlobe />
						English
					</Button>
				</div>
				<h2 className="font-bold mb-2">
					Üdvözlünk a családfa-megjelenítő
				</h2>
				<p>
					Ebben az applikációban más szolgáltatóktól (Ancestry,
					MyHeritage stb.) exportált GEDCOM fájlokat tudsz
					megjeleníteni, majd szerkeszteni.
				</p>
				<p className="mt-2">
					A külső megjelenést tetszés szerint változtathatod, úgy mint
					a vonalak színe, a személyi négyszögeg elhelyezkedése és
					színe stb.
				</p>
				<p className="mt-2">
					A kész fát letöltheted PDF formájában vagy pedig
					kinyomtathatod.
				</p>
				<p className="mt-2">
					Alapértelmezetten az applikáció nem tárolja a felhőben a
					családfában szereplő adatokat. Azok csak és kizárólag a te
					böngésződben lesznek eltárolva. Ha szeretnéd, hogy a
					szerkesztett fa bárhol elérhető legyen, engedélyezned kell a
					beállításokban a Felhő szinkronizálást.
					<br />A feltöltött adatokat nem használjuk, nem nézzük meg,
					harmadik félnek nem adjuk át. Az csak és kizárólag a
					<a
						className="underline"
						href="https://firebase.google.com/"
						target="_blank"
						rel="noreferrer"
					>
						Google Firebase
					</a>{" "}
					felhőszolgáltatásába kerül eltárolásra. <br />
					A feltöltött adatokat bármikor törölheted, csak kapcsold ki
					a szinkronizációt. <br />
					Az szerkesztőbe feltöltött GEDCOM fájlok tartalmáért,
					azokban tárolt személyes adatokért semmilyen felelősséget
					nem vállalunk. Azok kizárólag a felhasználó kutatásaiból
					származhatnak, és az azok birtoklásáért szükséges engedélyek
					kizárólagosan a felhasználó felelősségi körébe tartoznak.
				</p>
				<p className="mt-2">
					Az oldal további használatával elfogadod a fentebbi
					feltételeket.
				</p>
			</div>
		),
	},
	{
		selector: ".step-1",
		mutationObservables: [".step-1"],
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">GEDOM Feltöltése</h2>
				<p>
					Töltsd fel a családfád GEDCOM fájl-ját, hogy elkezdhesd a
					szerkesztést.
				</p>
			</div>
		),
	},
	{
		selector: ".step-2",
		mutationObservables: [".step-2"],
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Keresés</h2>
				<p>Itt tudsz keresni a fában szereplő személyek között.</p>
				<p>
					Kezd el beírni például, hogy Kovács.
					<br />
					Lehet pontosítani a keresést az alábbi kulcsszavakkal is:
					Kezdődik, Végződik, Tartalmazza, Pontosan.
					<br />
					Valamint megadhatod, hogy a Keresztnév, Vezetéknév vagy
					Teljes név használatával szeretnél-e keresni.
				</p>
				<p>
					<h2 className="font-bold mb-2">Példák</h2>
					<ul>
						<li>Vezetéknév Kezdődik:Kov</li>
						<li>Keresztnév Tartalmazza:Jakab</li>
						<li>Teljes név Pontosan:Kovács Béla</li>
					</ul>
				</p>
			</div>
		),
	},
	{
		selector: ".step-3",
		mutationObservables: [".step-3"],
		disableActions: false,
		action: () => {
			const main = store.getState().main;
			const gedcom = getGedcomCache(main.selectedRaw, value(main, "raw"));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			onSelect(undefined as any, undefined as any, "sidebar");

			setTimeout(() => {
				onSelect(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					undefined as any,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					gedcom?.indi(0)?.id as any,
					"sidebar"
				);
			}, 5000);
		},
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Személyek a fán</h2>
				<p>
					Itt találod azokat a személyeked, akik a GEDCOM fájlban
					szerepelnek. <br />
					Kattintással ki tudod választani az adott személyt.
					<br />
					Vagy fogd meg, hogy ráhúzhasd a szerkesztő területre.
				</p>
				<p>
					Amennyiben automatikusan szeretnél fát generálni, elég ha
					csak kiválasztod a megfelelő személyt.
				</p>
			</div>
		),
	},
	{
		selector: ".step-4",
		mutationObservables: [".step-4"],
		disableActions: false,
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Műveletek</h2>
				<p>
					Itt találod az alábbi műveletekhez a gombokat:
					<br />
					Nyomtatás, Letöltés, Törlés, Alaphelyzetbe állítás, Személy
					teljes fájának létrehozása, Személy egyenesági fájának
					létrehozása, valamint a legfontosabb: Munkám támogatása :)
				</p>
			</div>
		),
	},
	{
		selector: ".step-5",
		mutationObservables: [".step-5"],
		disableActions: false,
		afterAction: () => {
			onDone();
		},
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Szerkesztő terület</h2>
				<p>
					Ide tudod húzni a baloldali panelből a személyeket, majd itt
					is hosszan kattintva megfoghatod és arrébb mozgathatod őket.
					<br />
					A nagyításhoz használd az egered görgőjét vagy touchpad-os
					gép esetében a 3 ujjas nagyítást.
					<br />A terület mozgatását a CTRL gomb lenyomása mellett a
					teljes terület megfogásával tudod megtenni.
				</p>
			</div>
		),
	},
];

export const stepsEN: (onSelect: OnSelect, onDone: OnDone) => StepType[] = (
	onSelect,
	onDone
) => [
	{
		selector: "body",
		styles: {
			popover: (base) => ({
				...base,
				width: "50vw",
				maxWidth: "50vw",
			}),
		},
		content: (
			<div className="flex flex-col">
				<div className="flex justify-start">
					<Button
						className="w-[100px] flex justify-start items-center gap-2"
						onClick={() => {
							store.dispatch(actions.setLanguage("en"));
							window.location.reload();
						}}
					>
						<HiGlobe />
						magyar
					</Button>
				</div>
				<h2 className="font-bold mb-2">
					Welcome to family tree visualiser
				</h2>
				<p>
					In this application, you can import GEDCOM files that are
					exported from third party applications (Ancestry, MyHeritage
					etc.) and edit its layout.
				</p>
				<p className="mt-2">
					You can customize the visualize of tree, for example color
					of lines, position and color of rectangles of persons etc.
				</p>
				<p className="mt-2">
					You can download or print the completed tree in PDF.
				</p>
				<p className="mt-2">
					By default the application does not store any data of your
					tree. Those are stored only browser&apos;s local storage. If
					you want to have you edited tree available from everywhere,
					you must allow the application to synchronize with Cloud.
					<br />
					We never use the uploaded data, never check it, never give
					it any third party person or company. That is only stored in{" "}
					<a
						className="underline"
						href="https://firebase.google.com/"
						target="_blank"
						rel="noreferrer"
					>
						Google Firebase
					</a>{" "}
					cloud services.
					<br />
					You can entirely remove the uploaded data from the cloud, to
					do it, just turn off the synchronization.
					<br />
					We dont take any responsibility for the content, personal
					data stored in them of GEDCOM files uploaded to the editor.
					They are solely from the user&apos;s research may come from,
					and the licenses required for their possession they are the
					sole responsibility of the user.
				</p>
				<p className="mt-2">
					By continuing to use this page, you accept the above
					conditions.
				</p>
			</div>
		),
	},
	{
		selector: ".step-1",
		mutationObservables: [".step-1"],
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Upload GEDOM</h2>
				<p>Upload GEDCOM file of your tree to start editing.</p>
			</div>
		),
	},
	{
		selector: ".step-2",
		mutationObservables: [".step-2"],
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Search</h2>
				<p>You can find for a person here</p>
				<p>
					Just start typing for example Kovács.
					<br />
					You can specify the search query with keys: Starts with,
					Ends with, Contains, Exact.
					<br />
					Or you can choose which part of the name you&apos;d like to
					use, eg: Surname, Givenname or Fullname.
				</p>
				<p>
					<h2 className="font-bold mb-2">Examples</h2>
					<ul>
						<li>Surname Starts with:Kov</li>
						<li>Givenname Contains:Jakab</li>
						<li>Fullname Exact:Kovács Béla</li>
					</ul>
				</p>
			</div>
		),
	},
	{
		selector: ".step-4",
		mutationObservables: [".step-4"],
		disableActions: false,
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Műveletek</h2>
				<p>
					You can find the contol buttons:
					<br />
					Print, Download, Clear, Reset, Person&apos; genealogy,
					Person&apos; tree and the most important: Support my work :)
				</p>
			</div>
		),
	},
	{
		selector: ".step-5",
		mutationObservables: [".step-5"],
		disableActions: false,
		afterAction: () => {
			onDone();
		},
		content: (
			<div className="flex flex-col">
				<h2 className="font-bold mb-2">Editor stage</h2>
				<p>
					Here, you can drag and drop individuals from sidebar and you
					can grab and move to another place on the stage as well.
					<br />
					To zoom the stage use your mouse wheel or if you are on a
					machine that has touchpad, you can use 3 fingers gesture.
					<br />
					To move the entire stage, just use CTRL button and grab the
					stage.
				</p>
			</div>
		),
	},
];
