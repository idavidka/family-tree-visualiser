import { type ConvertOptions } from "../interfaces/common";
import type IGedcom from "../interfaces/gedcom";
import type IGedComStructure from "../../../types/structures/gedcom";
import {
	type IdType,
	type IndiKey,
	type FamKey,
	type ObjeKey,
	type SourKey,
	type RepoKey,
	type SubmKey,
	type MultiTag,
} from "../../../types/types";
import { getVersion } from "../../../utils/get-product-details";
import { Common, createCommon, getValidKeys } from "./common";
import { type FamType } from "./fam";
import { type Families } from "./fams";
import { type IndiType } from "./indi";
import { type Individuals } from "./indis";
import { type List } from "./list";
import { type ObjeType } from "./obje";
import { type Objects } from "./objes";
import { type RepoType } from "./repo";
import { type Repositories } from "./repos";
import { type SourType } from "./sour";
import { type Sources } from "./sours";
import { type SubmType } from "./subm";
import { type Submitters } from "./subms";

export class GedCom extends Common implements IGedcom {
	constructor() {
		super();

		delete this.gedcom;
		delete this.id;

		this.removeValue();
	}

	toIndiArray(): IndiType[] {
		return Object.values(this.get("INDIVIDUALS") ?? {});
	}

	toFamArray(): FamType[] {
		return Object.values(this.get("FAMILIES") ?? {});
	}

	private getMain<L extends List = List, T extends Common = Common>(
		type: MultiTag,
		index: number | string
	): T | undefined {
		const list = this.getList<L>(type);

		if (!list) {
			return undefined;
		}

		if (typeof index === "string") {
			return list.item(index as IdType) as T | undefined;
		}

		const keyProbe: IdType = `@I${index}@`;
		const itemProbe = list.item(keyProbe);

		if (itemProbe) {
			return itemProbe as T;
		}

		const keys = Object.keys(list.items ?? {}) as IdType[];
		return list.item(keys[index]) as T | undefined;
	}

	getList<T extends List = List>(type: MultiTag): T | undefined {
		return this.get(type);
	}

	indis() {
		return this.getList<Individuals>("INDIVIDUALS");
	}

	fams() {
		return this.getList<Families>("FAMILIES");
	}

	objes() {
		return this.getList<Objects>("OBJECTS");
	}

	sours() {
		return this.getList<Sources>("SOURCES");
	}

	repos() {
		return this.getList<Repositories>("REPOSITORIES");
	}

	subms() {
		return this.getList<Submitters>("SUBMITTERS");
	}

	indi(index: number | IndiKey) {
		return this.getMain<Individuals, IndiType>("INDIVIDUALS", index);
	}

	fam(index: number | FamKey) {
		return this.getMain<Families, FamType>("FAMILIES", index);
	}

	obje(index: number | ObjeKey) {
		return this.getMain<List, ObjeType>("OBJECTS", index);
	}

	sour(index: number | SourKey) {
		return this.getMain<List, SourType>("SOURCES", index);
	}

	repo(index: number | RepoKey) {
		return this.getMain<List, RepoType>("REPOSITORIES", index);
	}

	subm(index: number | SubmKey) {
		return this.getMain<List, SubmType>("SUBMITTERS", index);
	}

	private getIndiRelatedLists(
		indis: IndiKey[]
	): Pick<GedComType, "INDIVIDUALS" | "FAMILIES" | "OBJECTS" | "SOURCES"> {
		const individuals = this.indis()?.filter((_, indiKey) => {
			return indis.includes(indiKey as IndiKey);
		});

		const families = this.fams()?.filter((fam) => {
			if (
				Object.values(fam.WIFE?.toList().items ?? {}).find((indi) =>
					indis.includes(indi?.value as IndiKey)
				)
			) {
				return true;
			}
			if (
				Object.values(fam.HUSB?.toList().items ?? {}).find((indi) =>
					indis.includes(indi?.value as IndiKey)
				)
			) {
				return true;
			}
			if (
				Object.values(fam.CHIL?.toList().items ?? {}).find((indi) =>
					indis.includes(indi?.value as IndiKey)
				)
			) {
				return true;
			}
			return false;
		});

		const includedObjects = indis
			.map((indiKey) =>
				Object.values(
					this.indi(indiKey)?.OBJE?.toList().items ?? {}
				).map((obje) => obje?.value)
			)
			.flat()
			.filter(Boolean) as ObjeKey[];

		const objects = this.objes()?.filter((_, objeKey) => {
			return includedObjects.includes(objeKey as ObjeKey);
		});

		const includedSources = indis
			.map((indiKey) => {
				const indi = this.indi(indiKey);

				return Object.entries(indi ?? {}).map(([key, prop]) => {
					if (
						!indi ||
						!getValidKeys(indi).includes(key as MultiTag)
					) {
						return null;
					}

					return Object.values(
						(prop as Common)?.get?.("SOUR")?.toList().items ?? {}
					).map((sour) => sour?.value);
				});
			})
			.flat()
			.flat()
			.filter(Boolean) as SourKey[];

		const sources = this.sours()?.filter((_, sourKey) => {
			return includedSources.includes(sourKey as SourKey);
		});

		return {
			INDIVIDUALS: individuals,
			FAMILIES: families,
			OBJECTS: objects,
			SOURCES: sources,
		};
	}

	private getDownloadHeader() {
		const newHead = createCommon() as Required<IGedComStructure>["HEAD"];

		Object.assign(newHead!, this.get("HEAD") ?? {});

		const newSour = createCommon() as Required<
			Required<IGedComStructure>["HEAD"]
		>["SOUR"];
		newSour.set("CORP", createCommon());
		newSour.set("CORP.WWW", createCommon());
		newSour.set("NAME", createCommon());
		newSour.set("VERS", createCommon());

		newSour.CORP!.value = "Family Tree Visualiser";
		newSour.CORP!.WWW!.value = "treevisualiser.idavid.hu";
		newSour.NAME!.value = "Family Tree Visualiser";
		newSour.VERS!.value = getVersion();

		newHead!.set("SOUR", newSour);

		return newHead;
	}

	toFiltered(indis: IndiKey[]) {
		if (!indis.length) {
			return this;
		}

		const newGedcom = createGedCom();

		const newContent = this.getIndiRelatedLists(indis);

		Object.assign(newGedcom, this, newContent, {
			HEAD: this.getDownloadHeader(),
		});

		return newGedcom;
	}

	toJson(
		tag?: MultiTag | undefined,
		options?:
			| (ConvertOptions & {
					indis?: IndiKey[];
			  })
			| undefined
	): string {
		if (!options?.indis?.length) {
			return super.toJson(tag, options);
		}

		const newGedcom = createGedCom();

		const newContent = this.getIndiRelatedLists(options.indis);

		Object.assign(newGedcom, this, newContent, {
			HEAD: this.getDownloadHeader(),
		});

		delete options.indis;
		return newGedcom.toJson(tag, options);
	}

	toGedcom(
		tag?: MultiTag | undefined,
		level?: number,
		options?:
			| (ConvertOptions & {
					indis?: IndiKey[];
			  })
			| undefined
	): string {
		if (!options?.indis?.length) {
			return super.toGedcom(tag, level, options);
		}

		const newGedcom = createGedCom();

		const newContent = this.getIndiRelatedLists(options.indis);

		Object.assign(newGedcom, this, newContent, {
			HEAD: this.getDownloadHeader(),
		});

		delete options.indis;
		return newGedcom.toGedcom(tag, level, options);
	}
}

export type GedComType = GedCom & IGedComStructure;
export const createGedCom = (): GedComType => {
	return new GedCom();
};
