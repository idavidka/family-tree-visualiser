import { Common, createCommon } from "../classes/gedcom/classes/common";
import { createCommonDate } from "../classes/gedcom/classes/date";
import { createFam } from "../classes/gedcom/classes/fam";
import { Families } from "../classes/gedcom/classes/fams";
import { GedCom, createGedCom } from "../classes/gedcom/classes/gedcom";
import { createIndi } from "../classes/gedcom/classes/indi";
import { Individuals } from "../classes/gedcom/classes/indis";
import { List } from "../classes/gedcom/classes/list";
import { createCommonName } from "../classes/gedcom/classes/name";
import { createCommonNote } from "../classes/gedcom/classes/note";
import { createObje } from "../classes/gedcom/classes/obje";
import { createRepo } from "../classes/gedcom/classes/repo";
import { createSour } from "../classes/gedcom/classes/sour";
import { createSubm } from "../classes/gedcom/classes/subm";
import {
	type ConvertType,
	type FamKey,
	type IndiKey,
	type ObjeKey,
	type RepoKey,
	type SourKey,
	type SubmKey,
	type IdType,
	type MultiTag,
	ReverseTypeMap,
} from "../types/types";

const GedcomTree = {
	parse: function (content: string) {
		return this.parseHierarchy(content);
	},
	parseHierarchy: function (content: string) {
		const gedcom = createGedCom();
		gedcom.removeValue();
		const reg =
			/(^[0-9]) (?:(@[_A-Z0-9]*@) )?(_[_A-Z]{3,}|_?[A-Z]{3,5}) ?(.*)/;
		let key: string | undefined;
		let type: MultiTag | ConvertType;
		let idCheck: string;
		let value: string | undefined;
		let indent: number | undefined = 0;
		let prevIndent = 0;
		let curNode: Common | List = gedcom as Common;
		let prevNode: Common | List;
		const curPar: Array<Common | List> = [];
		const lines = content.split(/\r?\n/);

		lines.forEach(function (line: string) {
			if (line.length === 0) {
				return; // skip empty
			}
			const match = reg.exec(line);
			if (match?.[1] === undefined) {
				throw new Error(`can't parse line ${line}`);
			}
			indent = Number(match[1]);

			if (match?.[2] !== undefined) {
				key = match?.[3] + match?.[2];
			} else {
				key = match?.[3];
			}
			value = match?.[4];
			[type, idCheck] = (key?.split("@") ?? []) as [MultiTag, string];
			const id = idCheck ? `@${idCheck}@` : undefined;
			if (indent > prevIndent) {
				curPar.push(curNode);
				curNode = prevNode;
			} else if (indent < prevIndent) {
				for (let i = 0; i < prevIndent - indent; ++i) {
					curNode = curPar.pop() as Common;
				}
			}

			if (id) {
				const convertType = type as ConvertType;
				if (convertType === "REPO") {
					type = ReverseTypeMap[convertType];
					prevNode = createRepo(gedcom, id as RepoKey);
				} else if (convertType === "SUBM") {
					type = ReverseTypeMap[convertType];
					prevNode = createSubm(gedcom, id as SubmKey);
				} else if (convertType === "SOUR") {
					type = ReverseTypeMap[convertType];
					prevNode = createSour(gedcom, id as SourKey);
				} else if (
					convertType === "OBJE" &&
					curNode instanceof GedCom
				) {
					type = ReverseTypeMap[convertType];
					prevNode = createObje(gedcom, id as ObjeKey);
				} else if (convertType === "INDI") {
					type = ReverseTypeMap[convertType];
					prevNode = createIndi(gedcom, id as IndiKey);
				} else if (convertType === "FAM") {
					type = ReverseTypeMap[convertType];
					prevNode = createFam(gedcom, id as FamKey);
				} else {
					prevNode = createCommon(gedcom);
				}
			} else {
				if (type === "OBJE") {
					prevNode = createObje(gedcom);
				} else if (type === "DATE") {
					prevNode = createCommonDate(gedcom);
				} else if (type === "NOTE") {
					prevNode = createCommonNote(gedcom);
				} else if (type === "NAME") {
					prevNode = createCommonName(gedcom);
				} else {
					prevNode = createCommon(gedcom);
				}
			}

			if (prevNode instanceof Common) {
				if (value) {
					prevNode.value = value;
				} else {
					prevNode.removeValue();
				}
			}

			if (type && type !== "value") {
				const curCommon = curNode as Common;
				let curValue = curCommon.get<List>(type as MultiTag);
				if (id) {
					if (type === "INDIVIDUALS") {
						curValue = curValue || new Individuals();
					} else if (type === "FAMILIES") {
						curValue = curValue || new Families();
					} else {
						curValue = curValue || new List();
					}
					curCommon.set(type as MultiTag, curValue);
					curValue.item(id as IdType, prevNode);
				} else if (curValue?.isListable) {
					if (curValue instanceof Common) {
						curValue = new List().concat({ ...[curValue] });
						curCommon.set(type as MultiTag, curValue);
					}
					curValue.concat({
						...[...Object.values(curValue.items), prevNode],
					});
				} else {
					curCommon.set(type as MultiTag, prevNode);
				}
			}

			prevIndent = indent;
		});

		return gedcom;
	},
};

export default GedcomTree;
