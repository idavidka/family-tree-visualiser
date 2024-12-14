import type IIndi from "../interfaces/indi";
import type IIndividualStructure from "../../../types/structures/individual";
import {
	type IndiKey,
	type FamKey,
	type Filter,
	type RequiredFilter,
	type ObjeKey,
	type MultiTag,
	type TagKey,
	type RelationType,
	type IdType,
} from "../../../types/types";
import { implemented } from "../../../utils/logger";
import { Common, createCommon } from "./common";
import { type GedComType } from "./gedcom";
import { Individuals } from "./indis";
import * as Filters from "../../../constants/filters";
import { Families } from "./fams";
import { List } from "./list";
import {
	type MediaList,
	type GeneratedIndiMethods,
	type GeneratorKey,
	type GeneratorType,
} from "../interfaces/indi";
import {
	AGE_ASC,
	DATE_ASC,
	getMarriageAsc,
	getMarriageAscAndChildBirth,
} from "../../../constants/orders";
import { type ObjeType } from "./obje";
import { type Kinship } from "../../kinship-translator/kinship-translator.interface";
import KinshipTranslator from "../../kinship-translator/kinship-translator";
import { pathCache, relativesCache } from "../../../utils/cache";
import { type Language } from "../../../translation/i18n";
import { dateFormatter } from "../../../utils/date-formatter";
import { CommonName, createCommonName } from "./name";
import { type AncestryMedia } from "../../../types/ancestry-media";

const ALLOWED_FACTS: MultiTag[] = [
	"EVEN",
	"OCCU",
	"RESI",
	"EDUC",
	"GRAD",
	"IMMI",
	"RELI",
	"_MILT",
	"FACT",
];

const DISALLOWED_CUSTOM_FACTS: string[] = ["DNA Test", "Newspaper"];

const CustomFactRenderers: Partial<
	Record<MultiTag, (label: Common, fact: Common, indi?: IndiType) => void>
> = {
	AKA: (label: Common, fact: Common, indi?: IndiType) => {
		const originalNameObj = indi?.NAME;
		const originalName = originalNameObj?.toValue() as string | undefined;
		const note = fact.get("NOTE");
		const factName = note?.toValue() as string | undefined;

		const name = createCommonName(fact.getGedcom());
		const suffix = originalNameObj?.NSFX?.toValue() as string | undefined;
		const surname = originalNameObj?.SURN?.toValue() as string | undefined;
		const givenname = originalNameObj?.GIVN?.toValue() as
			| string
			| undefined;

		const nameParts: Array<{
			name: string;
			givenname?: boolean;
			surname?: boolean;
			suffix?: boolean;
		}> = [
			...(givenname
				?.split(" ")
				.map((s) => ({ name: s, givenname: true })) ?? []),
			...(surname?.split(" ").map((s) => ({ name: s, surname: true })) ??
				[]),
			...(suffix?.split(" ").map((s) => ({ name: s, suffix: true })) ??
				[]),
		].filter(Boolean);

		const factParts = factName?.split(" ");
		if (
			nameParts.length === factParts?.length &&
			!(note instanceof CommonName)
		) {
			const guessedSuffix: string[] = [];
			const guessedSurname: string[] = [];
			const guessedGivenname: string[] = [];
			factParts.forEach((f, i) => {
				const namePart = nameParts[i];
				if (!f) {
					return;
				}
				if (namePart.suffix) {
					guessedSuffix.push(f);
				} else if (namePart.givenname) {
					guessedGivenname.push(f);
				} else if (namePart.surname) {
					guessedSurname.push(f);
				}
			});
			const allNamePart: string[] = [];
			if (guessedGivenname.length) {
				allNamePart.push(guessedGivenname.join(" "));
			}
			if (guessedSurname.length) {
				allNamePart.push(`/${guessedSurname.join(" ")}/`);
			}
			if (guessedSuffix.length) {
				allNamePart.push(guessedSuffix.join(" "));
			}
			name.value = allNamePart.join(" ");
		} else {
			name.value = factName;
		}

		fact.set("NOTE", name);

		label.value = "AKA";
		fact.set("_LABEL", label);
	},
};

const relativesOnLevelCache = relativesCache("relativesOnLevelCache");
const relativesOnDegreeCache = relativesCache("relativesOnDegreeCache");

export class Indi extends Common<string, IndiKey> implements IIndi {
	private _isUnknownAncestor?: boolean;
	private _isUnattachedMember?: boolean;
	private _isUnknownGivenname?: boolean;
	private _isUnknownSurname?: boolean;

	toName() {
		return this.get<Common>("NAME")?.toValue();
	}

	toNaturalName() {
		return this.get<Common>("NAME")?.toValue()?.replaceAll("/", "");
	}

	private generateTree(
		generations: IndiTree | IndiGenealogy,
		level: number,
		index: number,
		showDescendants?: boolean,
		offspringSpouses?: boolean,
		ancestorSpouses?: boolean,
		onlyDescendants?: boolean
	) {
		if (!this.id) {
			throw new Error("Indi must have an id");
		}
		const isMainDescendantLevel = showDescendants && level <= 1;
		const isDescendantLevel = showDescendants && level < 1;
		if (level < 1 && !isDescendantLevel) {
			throw new Error("Arguments 2 must be greater than 0.");
		}

		// Only for debug
		// if (level > 3) {
		// 	return this;
		// }

		const gens: IndiTree = generations ?? {
			existed: {},
			tree: {},
		};

		const id = this.get("FAMC")?.toList().index(0)?.toValue() as
			| FamKey
			| undefined;
		let father = isDescendantLevel ? undefined : this.getFathers().index(0);
		let mother = isDescendantLevel ? undefined : this.getMothers().index(0);
		const children = isMainDescendantLevel ? this.getChildren() : undefined;

		if (father?.id && gens.existed[father.id]) {
			// console.info("Father already in tree", father);
			father = undefined;
		}

		if (mother?.id && gens.existed[mother.id]) {
			// console.info("Mother already in tree", mother);
			mother = undefined;
		}

		if (!id && !father && !mother && !children?.length) {
			return this;
		}

		let fatherSpouses: Individuals | undefined;
		if (father && ancestorSpouses) {
			fatherSpouses = father
				.getSpouses()
				.orderBy(getMarriageAscAndChildBirth(father.id));

			if (mother) {
				fatherSpouses = fatherSpouses.except(mother);
			}
		}

		let motherSpouses: Individuals | undefined;
		if (mother && ancestorSpouses) {
			motherSpouses = mother
				.getSpouses()
				.orderBy(getMarriageAscAndChildBirth(mother.id));

			if (father) {
				motherSpouses = motherSpouses.except(father);
			}
		}

		let childIndex = 0;
		const closers: TreeMember & {
			children?: IndiType[];
		} = {
			id: id || this.id,
			father: isDescendantLevel
				? this.isMale()
					? this
					: undefined
				: onlyDescendants
				? undefined
				: father?.generateTree(
						gens,
						level + 1,
						index * 2,
						undefined,
						undefined,
						ancestorSpouses
				  ),
			fatherSpouses:
				fatherSpouses &&
				(Object.values(fatherSpouses.items ?? {}) as IndiType[]),
			mother: isDescendantLevel
				? this.isFemale()
					? this
					: undefined
				: onlyDescendants
				? undefined
				: mother?.generateTree(
						gens,
						level + 1,
						index * 2 + 1,
						undefined,
						undefined,
						ancestorSpouses
				  ),
			motherSpouses:
				motherSpouses &&
				(Object.values(motherSpouses.items ?? {}) as IndiType[]),
			children: children
				?.map((descendant) => {
					const descendantTree = descendant.generateTree(
						gens,
						level === 1 ? -1 : level - 1,
						childIndex++,
						true,
						offspringSpouses
					);
					if (offspringSpouses) {
						const spousesTrees = descendant
							.getSpouses()
							.orderBy(getMarriageAscAndChildBirth(descendant.id))
							.map((spouse) => {
								return spouse.generateTree(
									gens,
									level === 1 ? -1 : level - 1,
									childIndex++,
									true,
									offspringSpouses
								);
							});
						return [descendantTree, ...spousesTrees];
					}

					return [descendantTree];
				})
				.flat(),
		};

		if (!gens.tree[level]) {
			const amount = Math.pow(2, level - 1);
			gens.tree[level] =
				level >= 1 ? new Array(amount).fill(undefined) : [];
		}

		if (level < 0) {
			gens.tree[level].push(closers);
		} else {
			gens.tree[level][index] = closers;
		}
		if (father?.id) {
			gens.existed[father.id] = true;
		}

		if (mother?.id) {
			gens.existed[mother.id] = true;
		}

		[
			...(closers.children ?? []),
			...(closers.fatherSpouses ?? []),
			...(closers.motherSpouses ?? []),
		]?.forEach(({ id }) => {
			if (id) {
				gens.existed[id] = true;
			}
		});

		return this;
	}

	getTree(
		descendants?: boolean,
		offspringSpouses?: boolean,
		ancestorSpouses?: boolean,
		onlyDescendants?: boolean
	) {
		const newGenerations: IndiTree = {
			existed: {},
			tree: {},
		};
		this.generateTree(
			newGenerations,
			1,
			0,
			descendants,
			offspringSpouses,
			ancestorSpouses,
			onlyDescendants
		);
		return Object.keys(newGenerations.tree)
			.toSorted((a, b) => Number(a) - Number(b))
			.map((key) => {
				const gen = Number(key);
				return {
					gen,
					indis: newGenerations.tree[gen],
				};
			});
	}

	// @deprecated
	getGenealogy(onlyStraight = false, showDescendants = false) {
		const id = this.get("FAMC")?.toList().index(0)?.toValue() as
			| FamKey
			| undefined;
		if (!id) {
			return;
		}

		const own = this.isMale()
			? {
					father: this,
					mother: !onlyStraight
						? this.getSpouses().index(0)
						: undefined,
			  }
			: {
					mother: this,
					father: !onlyStraight
						? this.getSpouses().index(0)
						: undefined,
			  };

		const newGenerations: IndiGenealogy = {
			existed: {
				[this.id!]: true,
			},
			tree: {
				0: [
					{
						id,
						...own,
					},
				],
			},
		};

		this.generateTree(newGenerations, 1, 0, showDescendants);

		const gens = Object.keys(newGenerations.tree).toSorted(
			(a, b) => Number(b) - Number(a)
		);

		const genealogyGenerations: IndiGenealogyGenerations = {};
		const genealogyResult: IndiGenealogyResult = {};

		gens.forEach((genIndex) => {
			const gen = Number(genIndex);
			const generation = newGenerations.tree[gen];

			if (!genealogyGenerations[gen]) {
				genealogyGenerations[gen] = {
					left: [],
					main: { left: [], right: [] },
					right: [],
				};
			} else {
				if (!genealogyGenerations[gen].left) {
					genealogyGenerations[gen].left = [];
				}
				if (!genealogyGenerations[gen].main) {
					genealogyGenerations[gen].main = { left: [], right: [] };
				}
				if (!genealogyGenerations[gen].right) {
					genealogyGenerations[gen].right = [];
				}
			}

			generation.forEach((pack, index) => {
				const members: {
					left: Array<IndiType | undefined>;
					right: Array<IndiType | undefined>;
				} = { left: [], right: [] };

				["father", "mother"].forEach((type, mIndex) => {
					const key = type as keyof Pick<
						TreeMember,
						"father" | "mother"
					>;
					const typedPack = pack?.[key];
					const validIndex = index * 2 + mIndex;
					const side =
						validIndex >= generation.length ? "right" : "left";

					if (typedPack) {
						members[side].push(typedPack);
					}
				});

				if (!onlyStraight) {
					["father", "mother"].forEach((type, mIndex) => {
						const key = type as keyof Pick<
							TreeMember,
							"father" | "mother"
						>;
						const typedPack = pack?.[key];
						const validIndex = index * 2 + mIndex;
						const side =
							validIndex >= generation.length ? "right" : "left";

						const spouse =
							key === "father" ? pack?.mother : pack?.father;

						const spouses = Object.values(
							typedPack?.getSpouses().items ?? {}
						).filter((item) => {
							if (item?.id === spouse?.id) {
								return false;
							}

							if (item!.id && !newGenerations.existed[item!.id]) {
								newGenerations.existed[item!.id] = true;
								return true;
							}

							return false;
						}) as IndiType[];

						const rawSiblings = Object.values(
							typedPack?.getSiblings().orderBy(AGE_ASC).items ??
								{}
						);

						const siblings = rawSiblings.reduce<
							Array<IndiType | undefined>
						>((acc, item, index) => {
							if (item!.id && !newGenerations.existed[item!.id]) {
								newGenerations.existed[item!.id] = true;

								const siblingSpouses = Object.values(
									item?.getSpouses().items ?? {}
								).filter((siblingSpouse) => {
									if (
										siblingSpouse!.id &&
										!newGenerations.existed[
											siblingSpouse!.id
										]
									) {
										newGenerations.existed[
											siblingSpouse!.id
										] = true;
										return true;
									}

									return false;
								}) as IndiType[];

								if (siblingSpouses.length) {
									const newValue = item?.isMale()
										? [item, ...siblingSpouses]
										: [...siblingSpouses, item];

									return [
										...acc,
										...(index > 0 &&
										newValue.length > 1 &&
										acc[acc.length - 1] !== undefined
											? [undefined]
											: []),
										...newValue,
										...(index < rawSiblings.length - 1 &&
										newValue.length > 1
											? [undefined]
											: []),
									];
								}

								return [...acc, item];
							}

							return acc;
						}, []) as Array<IndiType | undefined>;

						const spouseMethod =
							key === "father" ? "unshift" : "push";
						const siblingMethod =
							side === "left" ? "unshift" : "push";
						members[side][spouseMethod](...spouses);

						if (siblings.length) {
							if (
								(key === "father" && pack?.mother) ||
								(key === "mother" && pack?.father)
							) {
								members[side][siblingMethod](undefined);
							}

							members[side][siblingMethod](...siblings);
						}
					});
				}

				genealogyGenerations[gen].main.left.push(
					members.left.length ? members.left : undefined
				);
				genealogyGenerations[gen].main.right.push(
					members.right.length ? members.right : undefined
				);
			});
		});

		gens.forEach((genIndex) => {
			const gen = Number(genIndex);
			const prevGen = gen - 1;

			if (!genealogyGenerations[prevGen]) {
				genealogyGenerations[prevGen] = {
					left: [],
					main: { left: [], right: [] },
					right: [],
				};
			}

			["left", "right"].forEach((s) => {
				const side = s as keyof MemberSide;

				if (!onlyStraight) {
					genealogyGenerations[gen].main[side].forEach((pack) => {
						if (!pack) {
							return;
						}

						const toRight = side === "right";
						const orderedPack = pack;

						orderedPack.forEach((indi) => {
							if (!indi) {
								return;
							}

							const rawChildren = Object.values(
								indi?.getChildren().orderBy(AGE_ASC).items ?? {}
							);

							const children = rawChildren.reduce<
								Array<IndiType | undefined>
							>((acc, item, index) => {
								if (
									item!.id &&
									!newGenerations.existed[item!.id]
								) {
									newGenerations.existed[item!.id] = true;

									const childSpouses = Object.values(
										item?.getSpouses().items ?? {}
									).filter((childSpouse) => {
										if (
											childSpouse!.id &&
											!newGenerations.existed[
												childSpouse!.id
											]
										) {
											newGenerations.existed[
												childSpouse!.id
											] = true;
											return true;
										}

										return false;
									}) as IndiType[];

									if (childSpouses.length) {
										const newValue = item?.isMale()
											? [item, ...childSpouses]
											: [...childSpouses, item];

										return [
											...acc,
											...(index > 0 &&
											newValue.length > 1 &&
											acc[acc.length - 1] !== undefined
												? [undefined]
												: []),
											...newValue,
											...(index <
												rawChildren.length - 1 &&
											newValue.length > 1
												? [undefined]
												: []),
										];
									}

									return [...acc, item];
								}

								return acc;
							}, []) as Array<IndiType | undefined>;

							const childMethod = "push";

							const members: Array<
								Array<IndiType | undefined> | undefined
							> = [];
							if (children.length) {
								members[childMethod](children);
							}

							if (toRight) {
								genealogyGenerations[prevGen].right.push(
									...members
								);
							} else {
								genealogyGenerations[prevGen].left.push(
									...members
								);
							}
						});
					});
				}

				if (genealogyGenerations[prevGen]) {
					genealogyGenerations[prevGen] = {
						left: [],
						main: {
							left: [
								...(genealogyGenerations[prevGen]?.left ?? []),
								...(genealogyGenerations[prevGen]?.main.left ??
									[]),
							],
							right: [
								...(genealogyGenerations[prevGen]?.main.right ??
									[]),
								...(genealogyGenerations[prevGen]?.right ?? []),
							],
						},
						right: [],
					};
				}
				genealogyResult[gen] = {
					left: [
						...(genealogyGenerations[gen]?.left ?? []),
						...(genealogyGenerations[gen]?.main.left ?? []),
					],
					right: [
						...(genealogyGenerations[gen]?.main.right ?? []),
						...(genealogyGenerations[gen]?.right ?? []),
					],
				};
			});
		});

		const result: Array<MemberSide<IndiType, { gen: number }>> = [];

		gens.forEach((genIndex) => {
			result.unshift({
				gen: Number(genIndex),
				...genealogyResult[Number(genIndex)],
			});
		});

		return result;
	}

	ancestryLink() {
		const www = this.gedcom?.HEAD?.SOUR?.CORP?.WWW?.value;
		const tree = this.getAncestryTreeId();

		if (this.id) {
			return `https://${www}/family-tree/person/tree/${tree}/person/${this.id.replace(
				/@|I/g,
				""
			)}/facts`;
		}
	}

	async ancestryMedia(namespace?: string | number): Promise<MediaList> {
		const list: MediaList = {};
		const objIds = Object.keys(this.get("OBJE")?.toValueList().items ?? {});
		const www = this.gedcom?.HEAD?.SOUR?.CORP?.WWW?.value;
		const tree = this.getAncestryTreeId();

		await Promise.all(
			objIds.map(async (objId) => {
				const key = objId as ObjeKey;
				const obje = this.gedcom
					?.obje(key)
					?.standardizeMedia(namespace, true, (ns, iId) => {
						return ns && iId
							? // eslint-disable-next-line max-len
							  `https://mediasvc.ancestry.com/v2/image/namespaces/${ns}/media/${iId}?client=trees-mediaservice&imageQuality=hq`
							: undefined;
					});

				const media = obje?.RIN?.value;
				const clone = obje?.get("_CLON._OID")?.toValue() as
					| string
					| undefined;
				const mser = obje?.get("_MSER._LKID")?.toValue() as
					| string
					| undefined;
				let url = obje?.get("FILE")?.toValue() as string | undefined;
				const title =
					(obje?.get("TITL")?.toValue() as string | undefined) ?? "";
				const type =
					(obje?.get("FORM")?.toValue() as string | undefined) ??
					"raw";

				const imgId = clone || mser;

				if (!www || !tree || !this.id) {
					return;
				}

				if (!namespace && !url) {
					try {
						const mediaDetailsResponse = await fetch(
							`https://www.ancestry.com/api/media/viewer/v2/trees/${tree}/media?id=${media}`
						);
						const mediaDetails =
							(await mediaDetailsResponse.json()) as AncestryMedia;
						if (mediaDetails.url) {
							url = `${mediaDetails.url}&imageQuality=hq`;
						}
					} catch (e) {}

					url =
						url ||
						`https://${www}/mediaui-viewer/tree/${tree}/media/${media}`;
				}

				if (url && imgId) {
					const id = `${tree}-${this.id}-${imgId}`;
					list[id] = {
						key,
						id,
						tree,
						imgId,
						person: this.id!,
						title: title as string,
						url,
						contentType: type as string,
						downloadName: `${this.id!.replaceAll("@", "")}_${
							this.toNaturalName()!.replaceAll(" ", "-") || ""
						}_${(
							(title as string) ||
							key.replaceAll("@", "").toString()
						).replaceAll(" ", "-")}`,
					};
				}
			})
		);

		return list;
	}

	myheritageLink(poolId = 0) {
		const www = this.gedcom?.HEAD?.SOUR?.CORP?.value
			?.toLowerCase()
			.replace(/^www\./gi, "");
		const site = this.getMyHeritageTreeId();
		const file = (
			this.gedcom?.HEAD?.get("FILE")?.toValue() as string | undefined
		)?.match(/Exported by MyHeritage.com from .+ in (?<site>.+) on .+$/)
			?.groups?.site;
		const normalizedFile = file
			?.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-");

		if (normalizedFile && this.id) {
			const id = Number(this.id.replace(/@|I/g, "")) + poolId;
			return `https://www.${www}/site-family-tree-${site}/${normalizedFile}#!profile-${id}-info`;
		}
	}

	myheritageMedia() {
		const list: MediaList = {};

		const tree = this.getMyHeritageTreeId();

		if (!tree) {
			return;
		}

		const birthObj = Object.values(
			this.get("BIRT.OBJE")?.toList().items ?? {}
		);
		const deathObj = Object.values(
			this.get("DEAT.OBJE")?.toValueList().items ?? {}
		);

		const familiesObj = Object.keys(
			this.get("FAMS")?.toValueList().items ?? {}
		)
			.concat(Object.keys(this.get("FAMC")?.toValueList().items ?? {}))
			.map((id) => {
				return this.gedcom?.fam(id as FamKey)?.get("MARR.OBJE") as
					| ObjeType
					| undefined;
			});

		birthObj
			.concat(deathObj)
			.concat(familiesObj)
			.forEach((o, index) => {
				if (!o) {
					return;
				}

				const obje = o as ObjeType;
				const key = `@O${index}@`;

				obje.standardizeMedia();

				const url = obje?.get("FILE")?.toValue() as string | undefined;
				const title =
					(obje?.get("NOTE")?.toValue() as string | undefined) ?? "";
				const type =
					(obje?.get("FORM")?.toValue() as string | undefined) ??
					"raw";

				const imgId = obje?.get("_PHOTO_RIN")?.toValue() as
					| string
					| undefined;

				if (url && imgId) {
					const id = `${tree}-${this.id}-${imgId}`;
					list[id] = {
						key,
						id,
						tree,
						imgId,
						person: this.id!,
						title: title as string,
						url,
						contentType: type as string,
						downloadName: `${this.id!.replaceAll("@", "")}_${
							this.toNaturalName()!.replaceAll(" ", "-") || ""
						}_${(
							(title as string) ||
							key.replaceAll("@", "").toString()
						).replaceAll(" ", "-")}`,
					};
				}
			});
		return list;
	}

	async multimedia(
		namespace?: string | number
	): Promise<MediaList | undefined> {
		if (this?.isAncestry()) {
			return await this.ancestryMedia(namespace);
		}

		if (this?.isMyHeritage()) {
			return this.myheritageMedia();
		}

		return undefined;
	}

	link(poolId?: number) {
		if (this?.isAncestry()) {
			return this.ancestryLink();
		}

		if (this?.isMyHeritage()) {
			return this.myheritageLink(poolId);
		}

		return undefined;
	}

	toFamilies(list: List): Families {
		const families = new Families();

		list.forEach((_item, famId) => {
			const family = this.gedcom?.fam(famId as FamKey);

			if (family) {
				families.item(famId as FamKey, family);
			}
		});

		return families;
	}

	isUnknownAncestor() {
		if (this._isUnknownAncestor !== undefined) {
			return this._isUnknownAncestor;
		}

		const unknownTag = Object.entries(
			this.gedcom?.get("_MTTAG")?.toList().items ?? {}
		).find(
			([_, tag]) => tag?.get("NAME")?.toValue() === "Unknown Ancestor"
		)?.[0] as TagKey | undefined;

		this._isUnknownAncestor = !!this?.get("_MTTAG")
			?.toList()
			.filter((tag) => tag.toValue() === unknownTag).length;

		return this._isUnknownAncestor;
	}

	isUnattachedMember() {
		if (this._isUnattachedMember !== undefined) {
			return this._isUnattachedMember;
		}

		const unknownTag = Object.entries(
			this.gedcom?.get("_MTTAG")?.toList().items ?? {}
		).find(
			([_, tag]) => tag?.get("NAME")?.toValue() === "Unattached member"
		)?.[0] as TagKey | undefined;

		this._isUnattachedMember = !!this?.get("_MTTAG")
			?.toList()
			.filter((tag) => tag.toValue() === unknownTag).length;

		return this._isUnattachedMember;
	}

	isUnknownGivenname() {
		if (this._isUnknownGivenname !== undefined) {
			return this._isUnknownGivenname;
		}

		const unknownTag = Object.entries(
			this.gedcom?.get("_MTTAG")?.toList().items ?? {}
		).find(
			([_, tag]) => tag?.get("NAME")?.toValue() === "Unknown givenname"
		)?.[0] as TagKey | undefined;

		this._isUnknownGivenname = !!this?.get("_MTTAG")
			?.toList()
			.filter((tag) => tag.toValue() === unknownTag).length;
		return this._isUnknownGivenname;
	}

	isUnknownSurname() {
		if (this._isUnknownSurname !== undefined) {
			return this._isUnknownSurname;
		}

		const unknownTag = Object.entries(
			this.gedcom?.get("_MTTAG")?.toList().items ?? {}
		).find(
			([_, tag]) => tag?.get("NAME")?.toValue() === "Unknown surname"
		)?.[0] as TagKey | undefined;

		this._isUnknownSurname = !!this?.get("_MTTAG")
			?.toList()
			.filter((tag) => tag.toValue() === unknownTag).length;
		return this._isUnknownSurname;
	}

	isNonRelevantMember() {
		return this.isUnknownAncestor() || this.isUnattachedMember();
	}

	isMale() {
		return this.get("SEX")?.toValue() === "M";
	}

	isFemale() {
		return this.get("SEX")?.toValue() === "F";
	}

	getParentType(id: IndiType) {
		let indi: IndiType | undefined;
		if (typeof id === "string" || typeof id === "number") {
			indi = this.gedcom?.indi(id);
		} else {
			indi = id;
		}

		if (!indi?.id || !this.id) {
			return;
		}

		const parents = this.getParents();

		let parent = parents.items[indi.id] ? indi : undefined;
		let child = this.gedcom?.indi(this.id);

		if (!parent?.id) {
			const children = this.getChildren();

			if (children.items[indi.id]) {
				parent = this.gedcom?.indi(this.id);
				child = indi;
			}
		}

		const familiesOfChildren = child?.get("FAMC")?.toValueList();
		if (!parent?.id || !child?.id || !familiesOfChildren) {
			return;
		}

		const families = this.toFamilies(familiesOfChildren);

		let childType = "";
		families.forEach((family) => {
			if (childType) {
				return;
			}
			const fatherId = family.get("HUSB")?.toValue() as
				| IndiKey
				| undefined;
			const motherId = family.get("WIFE")?.toValue() as
				| IndiKey
				| undefined;

			const usedRel =
				parent?.id === fatherId
					? "_FREL"
					: parent?.id === motherId
					? "_MREL"
					: undefined;

			if (!usedRel || !child?.id) {
				return;
			}

			const famChild =
				this.id && family.CHIL?.toValueList().items[child.id];

			if (!famChild) {
				return;
			}

			childType =
				(famChild.get(usedRel)?.toValue() as string) || "biological";
		});

		return (childType || "biological").toLowerCase() as RelationType;
	}

	hasFacts() {
		const dates = dateFormatter(this, true);

		if (dates.inArray.length) {
			return true;
		}

		const facts = this.getFacts(1);

		return !!facts.length;
	}

	getAkas(limit?: number) {
		return this.getFacts(limit, "AKA");
	}

	getFacts(limit?: number, filter?: MultiTag | MultiTag[]) {
		const filters = (Array.isArray(filter) ? filter : [filter]).filter(
			Boolean
		);
		const facts = new List();
		let id = 0;
		ALLOWED_FACTS.forEach((fact) => {
			const isCustom = ["EVEN", "FACT"].includes(fact);
			if (filters.length && !filters.includes(fact) && !isCustom) {
				return;
			}

			const factCommon = this.get(fact);
			const factCommons = factCommon?.toList();

			factCommons?.forEach((common, _, index) => {
				if (limit !== undefined && index >= limit) {
					return;
				}

				if (!common) {
					return;
				}

				const type = (
					isCustom ? common.get("TYPE")?.toValue() : fact
				) as MultiTag | undefined;

				if (!type || DISALLOWED_CUSTOM_FACTS.includes(type)) {
					return;
				}

				if (filters.length && !filters.includes(type) && isCustom) {
					return;
				}

				const label = createCommon(this.gedcom);
				const customRenderer = CustomFactRenderers[type];

				if (customRenderer) {
					customRenderer(label, common, this);
				} else {
					label.value = type;
					common.set("_LABEL", label);
				}
				common.id = `${id}` as IdType;
				id++;

				facts.append(common);
			});
		});

		return facts.orderBy(DATE_ASC);
	}

	path(
		person?: IndiKey | IndiType,
		options?: {
			breakAfterSpouse?: boolean;
			breakAfterNonBiological?: boolean;
		}
	): ReducedPath | undefined {
		const { breakAfterSpouse = true, breakAfterNonBiological } =
			options ?? {};
		const usedIndi =
			typeof person === "string" ? this.gedcom?.indi(person) : person;

		if (!this.id || !usedIndi?.id) {
			return;
		}

		const cacheKey = `${this.id}|${usedIndi.id}` as `${IndiKey}|${IndiKey}`;
		const cache = pathCache(cacheKey);
		if (cache) {
			return cache;
		}

		const visited = new Individuals().append(this);

		const mainItem: PathItem = {
			indi: this,
			level: 0,
			levelUp: 0,
			levelDown: 0,
			degree: 0,
			kinship: "self",
		};
		const path = [mainItem];
		if (this.id === usedIndi.id) {
			return path;
		}

		const queue: Queue = [
			{
				...mainItem,
				path,
			},
		];

		// Breadth-first search to find the shortest path
		let helper = 0;
		while (queue.length > 0) {
			if (helper++ > 1000000) {
				break;
			}

			const {
				indi,
				path,
				kinship,
				relation,
				level,
				levelUp,
				levelDown,
				degree,
				breakOnNext,
				breakAfterNext,
				inLaw,
			} = queue.shift() as QueueItem;

			if (usedIndi.id === indi.id) {
				if (breakOnNext) {
					return undefined;
				}

				pathCache(cacheKey, path);
				return path;
			}
			visited.append(indi);

			const additional: Partial<PathItem> = {};

			if (breakOnNext || breakAfterNext) {
				additional.breakOnNext = breakOnNext || breakAfterNext;
			}
			if (inLaw) {
				additional.inLaw = inLaw;
			}

			if (kinship === "spouse" && breakAfterSpouse) {
				if (path.length <= 2) {
					additional.inLaw = true;
				} else {
					additional.breakOnNext = true;
				}
			}

			// Direct relatives: Parents and Children
			if (kinship !== "child" || !breakAfterSpouse) {
				indi.getParents().forEach((relative) => {
					if (!visited.has(relative)) {
						const currentRelation = indi.getParentType(relative);
						if (
							breakAfterNonBiological &&
							currentRelation !== "biological"
						) {
							additional.breakAfterNext = true;
						}

						const newItem: PathItem = {
							indi: relative,
							kinship: "parent",
							relation:
								currentRelation &&
								currentRelation !== "biological"
									? currentRelation
									: relation,
							level: level + 1,
							levelUp: levelUp + 1,
							levelDown,
							degree,
							...additional,
						};
						queue.push({
							...newItem,
							path: [...path, newItem],
						});
					}
				});
			}

			indi.getChildren().forEach((relative) => {
				if (!visited.has(relative)) {
					const currentRelation = relative.getParentType(indi);
					if (
						breakAfterNonBiological &&
						currentRelation !== "biological"
					) {
						additional.breakAfterNext = true;
					}

					const newItem: PathItem = {
						indi: relative,
						kinship: "child",
						relation:
							currentRelation && currentRelation !== "biological"
								? currentRelation
								: relation,
						level: level - 1,
						levelUp,
						levelDown: levelDown + 1,

						degree: levelUp
							? level > 0
								? levelUp - level + 1
								: levelDown - Math.abs(level)
							: 0,
						...additional,
					};
					queue.push({
						...newItem,
						path: [...path, newItem],
					});
				}
			});

			// Spouses
			indi.getSpouses().forEach((relative) => {
				if (!visited.has(relative)) {
					const currentAddition: Partial<PathItem> = {};

					if (relation && relation !== "biological") {
						currentAddition.relation = relation;
					}
					if (inLaw) {
						currentAddition.breakOnNext = true;
					}
					const newItem: PathItem = {
						indi: relative,
						kinship: "spouse",
						level,
						levelUp,
						levelDown,
						degree,
						...additional,
						...currentAddition,
					};
					queue.push({
						...newItem,
						path: [...path, newItem],
					});
				}
			});
		}

		return undefined;
	}

	kinship<T extends boolean | undefined>(
		other?: IndiKey | IndiType,
		showMainPerson?: boolean,
		lang: Language = "en",
		entirePath?: T,
		displayName: "none" | "givenname" | "surname" | "all" = "givenname"
	) {
		const translator = new KinshipTranslator(
			this,
			other,
			lang,
			entirePath,
			showMainPerson ? displayName : undefined
		);

		return translator.translate(showMainPerson) as
			| (T extends false | undefined
					? string
					: Array<{
							id?: IndiKey;
							relative?: string;
							absolute?: string;
					  }>)
			| undefined;
	}

	private isRelativeOf(
		type:
			| "fullsibling"
			| "halfsibling"
			| "sibling"
			| "parent"
			| "child"
			| "spouse"
			| "parentInLaw"
			| "childInLaw"
			| "siblingInLaw",
		indi?: IndiKey | IndiType
	) {
		const usedIndi =
			typeof indi === "string" ? this.gedcom?.indi(indi) : indi;

		let getter:
			| keyof Pick<
					IndiType,
					| "getFullSiblings"
					| "getHalfSiblings"
					| "getSiblings"
					| "getParents"
					| "getChildren"
					| "getSpouses"
					| "getSiblingsInLaw"
					| "getParentsInLaw"
					| "getChildrenInLaw"
			  >
			| undefined;
		if (type === "fullsibling") {
			getter = "getFullSiblings";
		}
		if (type === "halfsibling") {
			getter = "getHalfSiblings";
		}
		if (type === "sibling") {
			getter = "getSiblings";
		}
		if (type === "parent") {
			getter = "getParents";
		}
		if (type === "child") {
			getter = "getChildren";
		}
		if (type === "spouse") {
			getter = "getSpouses";
		}
		if (type === "siblingInLaw") {
			getter = "getSiblingsInLaw";
		}
		if (type === "parentInLaw") {
			getter = "getParentsInLaw";
		}
		if (type === "childInLaw") {
			getter = "getChildrenInLaw";
		}

		if (!usedIndi || !getter) {
			return false;
		}

		const relatives = usedIndi[getter]();

		return Boolean(
			this.id && relatives.items[this.id]
				? relatives.index(0)?.id || true
				: false
		);
	}

	isSiblingOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("sibling", indi);
	}

	isFullSiblingOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("fullsibling", indi);
	}

	isHalfSiblingOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("halfsibling", indi);
	}

	isSpouseOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("spouse", indi);
	}

	isParentOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("parent", indi);
	}

	isChildOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("child", indi);
	}

	isSiblingInLawOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("siblingInLaw", indi);
	}

	isParentInLawOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("parentInLaw", indi);
	}

	isChildInLawOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("childInLaw", indi);
	}

	getRelativesOnDegree(degree = 0) {
		this.id = this.id || `@I${Math.random()}@`;
		const cache = relativesOnDegreeCache(this.id, degree);
		if (cache) {
			return cache;
		}

		let persons = this.getRelativesOnLevel(1)
			.getRelativesOnDegree(-1)
			.copy();
		const excludes = persons;

		if (!Math.abs(degree)) {
			return relativesOnDegreeCache(
				this.id,
				degree,
				persons.except(this)
			);
		}

		for (let i = 1; i < Math.abs(degree) + 1; i++) {
			const validDegree = i + 1;
			excludes.merge(persons);
			persons = this.getRelativesOnLevel(validDegree)
				.getRelativesOnDegree(-validDegree)
				.copy()
				.exclude(excludes);
		}

		return relativesOnDegreeCache(this.id, degree, persons);
	}

	getRelativesOnLevel(level = 0, filter?: Filter) {
		this.id = this.id || `@I${Math.random()}@`;
		const cache = relativesOnLevelCache(this.id, level);
		if (cache) {
			return cache;
		}

		let persons = new Individuals();

		const config = {
			isAscendant: level < 0,
			direction: level < 0 ? -1 : 1,
			key: level <= 0 ? "FAMS" : "FAMC",
		};
		let families = this.get(config.key as MultiTag)?.toValueList();

		if (!families) {
			return relativesOnLevelCache(this.id, level, persons);
		}

		if (filter) {
			families = families.filter(filter);
		}

		if (config.isAscendant) {
			persons = this.toFamilies(families).getChildren();
		} else {
			persons = this.toFamilies(families).getParents();
		}

		if (level >= -1 && level <= 1) {
			return relativesOnLevelCache(this.id, level, persons.except(this));
		}

		for (let i = 1; i < Math.abs(level); i++) {
			if (config.isAscendant) {
				persons = persons.getChildren();
			} else {
				persons = persons.getParents();
			}
		}

		return relativesOnLevelCache(this.id, level, persons.except(this));
	}

	getAscendants(level = 0, filter?: Filter) {
		if (!level) {
			return new Individuals();
		}

		return this.getRelativesOnLevel(level, filter);
	}

	getDescendants(level = 0, filter?: Filter) {
		if (!level) {
			return new Individuals();
		}

		return this.getRelativesOnLevel(-level, filter);
	}

	getAllDescendantsRaw(
		individuals?: Individuals,
		containDescendantsInLaw = false
	) {
		this.id = this.id || `@I${Math.random()}@`;
		let ownGeneration = new Individuals();

		if (individuals) {
			ownGeneration = individuals;
			ownGeneration.merge(this.getSpouses());
		}

		ownGeneration.append(this);

		const relatives = new Individuals();
		relatives.merge(ownGeneration);

		const generations: Record<number, Individuals | undefined> = {
			0: ownGeneration,
		};

		let currentGen = 0;
		const maxGenCheck = 100;
		while (currentGen < maxGenCheck) {
			const descentants = generations[currentGen]?.getChildren().copy();
			if (!descentants?.length) {
				break;
			}

			if (containDescendantsInLaw) {
				descentants?.merge(descentants?.getSpouses());
			}

			currentGen++;
			generations[currentGen] = descentants;

			relativesOnLevelCache(this.id, -currentGen, descentants);

			descentants && relatives.merge(descentants);
		}

		return { relatives, generations };
	}

	getAllDescendants(
		individuals?: Individuals,
		containDescendantsInLaw = false
	) {
		const raw = this.getAllDescendantsRaw(
			individuals,
			containDescendantsInLaw
		);

		return raw.relatives;
	}

	getAllAscendantsRaw(individuals?: Individuals) {
		this.id = this.id || `@I${Math.random()}@`;
		let ownGeneration = new Individuals();

		if (individuals) {
			ownGeneration = individuals;
		}

		ownGeneration.append(this);
		const relatives = new Individuals();
		relatives.merge(ownGeneration);

		const generations: Record<number, Individuals | undefined> = {
			0: ownGeneration,
		};

		let currentGen = 0;
		const maxGenCheck = 100;
		while (currentGen < maxGenCheck) {
			const parents = generations[currentGen]?.getParents().copy();
			if (!parents?.length) {
				break;
			}

			currentGen++;
			generations[currentGen] = parents;

			relativesOnLevelCache(this.id, currentGen, parents);

			parents && relatives.merge(parents);
		}

		return { relatives, generations };
	}

	getAllAscendants(individuals?: Individuals) {
		const raw = this.getAllAscendantsRaw(individuals);

		return raw.relatives;
	}

	getHalfSiblings() {
		const siblings = this.getSiblings();

		const ownParents = this.getBiologicalParents();

		const halfSiblings = new Individuals();

		siblings.forEach((sibling) => {
			const siblingsParents = sibling.getBiologicalParents();

			const inter = ownParents.intersection(siblingsParents);

			if (inter.length < ownParents.length) {
				halfSiblings.append(sibling);
			}
		});

		return halfSiblings;
	}

	getFullSiblings() {
		const siblings = this.getSiblings();

		const ownParents = this.getBiologicalParents();

		const fullSiblings = new Individuals();

		siblings.forEach((sibling) => {
			const siblingsParents = sibling.getBiologicalParents();

			const inter = ownParents.intersection(siblingsParents);

			if (inter.length === ownParents.length) {
				fullSiblings.append(sibling);
			}
		});

		return fullSiblings;
	}

	getSiblings() {
		implemented("getSiblings");
		return this.getRelativesOnDegree(0);
	}

	getBrothers() {
		implemented("getBrothers");
		return this.getSiblings().filter(Filters.MALE);
	}

	getSisters() {
		implemented("getSisters");
		return this.getSiblings().filter(Filters.MALE);
	}

	getChildren(filter?: Filter) {
		implemented("getChildren");
		return this.getDescendants(1, filter);
	}

	private getChildrenFilteredByPedigree(
		filter: RequiredFilter<"PEDI", string>
	) {
		const children = new Individuals();
		const familiesOfChildrens = this.get("FAMS")?.toValueList();

		if (!familiesOfChildrens || !this.id) {
			return children;
		}

		const families = this.toFamilies(familiesOfChildrens);

		families.forEach((family) => {
			const fatherId = family.get("HUSB")?.toValue() as
				| IndiKey
				| undefined;
			const motherId = family.get("WIFE")?.toValue() as
				| IndiKey
				| undefined;

			const usedRel =
				this.id === fatherId
					? "_FREL"
					: this.id === motherId
					? "_MREL"
					: undefined;

			if (!usedRel) {
				return;
			}

			const famChildren = this.id && family.CHIL?.toValueList();

			famChildren?.forEach((child) => {
				const childType = child.get(usedRel)?.toValue() as
					| string
					| undefined;
				if (
					(!childType && filter.PEDI === "BIOLOGICAL") ||
					childType?.toLowerCase() === filter.PEDI.toLowerCase()
				) {
					const childId = child?.toValue() as IndiKey | undefined;
					const childIndi = childId && this.gedcom?.indi(childId);
					if (childIndi) {
						children.append(childIndi);
					}
				}
			});
		});

		return children;
	}

	getBiologicalChildren() {
		implemented("getBiologicalChildren");
		return this.getChildrenFilteredByPedigree(Filters.BIOLOGICAL);
	}

	getAdoptedChildren() {
		implemented("getAdoptedChildren");
		return this.getChildrenFilteredByPedigree(Filters.ADOPTED);
	}

	getBirthChildren() {
		implemented("getBirthChildren");
		return this.getChildrenFilteredByPedigree(Filters.BIRTH);
	}

	getFosterChildren() {
		implemented("getFosterChildren");
		return this.getChildrenFilteredByPedigree(Filters.FOSTER);
	}

	getSealingChildren() {
		implemented("getSealingChildren");
		return this.getChildrenFilteredByPedigree(Filters.SEALING);
	}

	getStepChildren() {
		implemented("getStepChildren");
		return this.getChildrenFilteredByPedigree(Filters.STEP);
	}

	getSons() {
		implemented("getSons");
		return this.getChildren().filter(Filters.MALE);
	}

	getBiologicalSons() {
		implemented("getBiologicalSons");
		return this.getChildrenFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.MALE
		);
	}

	getAdoptedSons() {
		implemented("getAdoptedSons");
		return this.getAdoptedChildren().filter(Filters.MALE);
	}

	getBirthSons() {
		implemented("getBirthSons");
		return this.getBirthChildren().filter(Filters.MALE);
	}

	getFosterSons() {
		implemented("getFosterSons");
		return this.getFosterChildren().filter(Filters.MALE);
	}

	getSealingSons() {
		implemented("getSealingSons");
		return this.getSealingChildren().filter(Filters.MALE);
	}

	getStepSons() {
		implemented("getStepSons");
		return this.getStepChildren().filter(Filters.MALE);
	}

	getDaughters() {
		implemented("getDaughters");
		return this.getChildren().filter(Filters.FEMALE);
	}

	getBiologicalDaugthers() {
		implemented("getBiologicalDaugthers");
		return this.getChildrenFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.FEMALE
		);
	}

	getAdoptedDaughters() {
		implemented("getAdoptedDaughters");
		return this.getAdoptedChildren().filter(Filters.FEMALE);
	}

	getBirthDaughters() {
		implemented("getBirthDaughters");
		return this.getBirthChildren().filter(Filters.FEMALE);
	}

	getFosterDaughters() {
		implemented("getFosterDaughters");
		return this.getFosterChildren().filter(Filters.FEMALE);
	}

	getSealingDaughters() {
		implemented("getSealingDaughters");
		return this.getSealingChildren().filter(Filters.FEMALE);
	}

	getStepDaughters() {
		implemented("getStepDaughters");
		return this.getStepChildren().filter(Filters.FEMALE);
	}

	getParents(filter?: Filter) {
		implemented("getParents");
		return this.getAscendants(1, filter);
	}

	private getParentsFilteredByPedigree(
		filter: RequiredFilter<"PEDI", string>
	) {
		const parents = new Individuals();
		const familiesOfParents = this.get("FAMC")?.toValueList();

		if (!familiesOfParents || !this.id) {
			return parents;
		}

		const families = this.toFamilies(familiesOfParents);

		families.forEach((family) => {
			const child = this.id && family.CHIL?.toValueList()?.item(this.id);

			if (!child) {
				return;
			}

			const fatherType = child.get("_FREL")?.toValue() as
				| string
				| undefined;
			const motherType = child.get("_MREL")?.toValue() as
				| string
				| undefined;

			if (
				(!fatherType && filter.PEDI === "BIOLOGICAL") ||
				fatherType?.toLowerCase() === filter.PEDI.toLowerCase()
			) {
				const fatherId = family.get("HUSB")?.toValue() as
					| IndiKey
					| undefined;
				const father = fatherId && this.gedcom?.indi(fatherId);

				if (father) {
					parents.append(father);
				}
			}

			if (
				(!motherType && filter.PEDI === "BIOLOGICAL") ||
				motherType?.toLowerCase() === filter.PEDI.toLowerCase()
			) {
				const motherId = family.get("WIFE")?.toValue() as
					| IndiKey
					| undefined;
				const mother = motherId && this.gedcom?.indi(motherId);
				if (mother) {
					parents.append(mother);
				}
			}
		});

		return parents;
	}

	getBiologicalParents() {
		implemented("getBiologicalParents");
		return this.getParentsFilteredByPedigree(Filters.BIOLOGICAL);
	}

	getAdoptedParents() {
		implemented("getAdoptedParents");
		return this.getParentsFilteredByPedigree(Filters.ADOPTED);
	}

	getBirthParents() {
		implemented("getBirthParents");
		return this.getParentsFilteredByPedigree(Filters.BIRTH);
	}

	getFosterParents() {
		implemented("getFosterParents");
		return this.getParentsFilteredByPedigree(Filters.FOSTER);
	}

	getSealingParents() {
		implemented("getSealingParents");
		return this.getParentsFilteredByPedigree(Filters.SEALING);
	}

	getStepParents() {
		implemented("getStepParents");
		return this.getParentsFilteredByPedigree(Filters.STEP);
	}

	getFathers() {
		implemented("getFathers");
		return this.getParents().filter(Filters.MALE);
	}

	getBiologicalFathers() {
		implemented("getBiologicalFathers");
		return this.getParentsFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.MALE
		);
	}

	getAdoptedFathers() {
		implemented("getAdoptedFathers");
		return this.getParentsFilteredByPedigree(Filters.ADOPTED).filter(
			Filters.MALE
		);
	}

	getBirthFathers() {
		implemented("getBirthFathers");
		return this.getParentsFilteredByPedigree(Filters.BIRTH).filter(
			Filters.MALE
		);
	}

	getFosterFathers() {
		implemented("getFosterFathers");
		return this.getParentsFilteredByPedigree(Filters.FOSTER).filter(
			Filters.MALE
		);
	}

	getSealingFathers() {
		implemented("getSealingFathers");
		return this.getParentsFilteredByPedigree(Filters.SEALING).filter(
			Filters.MALE
		);
	}

	getStepFathers() {
		implemented("getStepFathers");
		return this.getParentsFilteredByPedigree(Filters.SEALING).filter(
			Filters.MALE
		);
	}

	getMothers() {
		implemented("getMothers");
		return this.getParents().filter(Filters.FEMALE);
	}

	getBiologicalMothers() {
		implemented("getBiologicalMothers");
		return this.getParentsFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.FEMALE
		);
	}

	getAdoptedMothers() {
		implemented("getAdoptedMothers");
		return this.getParentsFilteredByPedigree(Filters.ADOPTED).filter(
			Filters.FEMALE
		);
	}

	getBirthMothers() {
		implemented("getBirthMothers");
		return this.getParentsFilteredByPedigree(Filters.BIRTH).filter(
			Filters.FEMALE
		);
	}

	getFosterMothers() {
		implemented("getFosterMothers");
		return this.getParentsFilteredByPedigree(Filters.FOSTER).filter(
			Filters.FEMALE
		);
	}

	getSealingMothers() {
		implemented("getSealingMothers");
		return this.getParentsFilteredByPedigree(Filters.SEALING).filter(
			Filters.FEMALE
		);
	}

	getStepMothers() {
		implemented("getStepMothers");
		return this.getParentsFilteredByPedigree(Filters.STEP).filter(
			Filters.FEMALE
		);
	}

	getSpouses() {
		implemented("getSpouses");
		return this.getRelativesOnLevel(0);
	}

	getWives() {
		implemented("getWives");
		return this.getSpouses().filter(Filters.FEMALE);
	}

	getHusbands() {
		implemented("getHusbands");
		return this.getSpouses().filter(Filters.MALE);
	}

	getCousins() {
		implemented("getCousins");
		return this.getRelativesOnDegree(1);
	}

	getGrandParents() {
		implemented("getGrandParents");
		return this.getAscendants(2);
	}

	getGrandFathers() {
		implemented("getGrandFathers");
		return this.getGrandParents().filter(Filters.MALE);
	}

	getGrandMothers() {
		implemented("getGrandMothers");
		return this.getGrandParents().filter(Filters.FEMALE);
	}

	getGrandChildren() {
		implemented("getGrandChildren");
		return this.getDescendants(2);
	}

	getGrandSons() {
		implemented("getGrandSons");
		return this.getGrandChildren().filter(Filters.MALE);
	}

	getGrandDaughters() {
		implemented("getGrandDaughters");
		return this.getGrandChildren().filter(Filters.FEMALE);
	}

	getGreatGrandParents() {
		implemented("getGreatGrandParents");
		return this.getAscendants(3);
	}

	getGreatGrandFathers() {
		implemented("getGreatGrandFathers");
		return this.getGreatGrandParents().filter(Filters.MALE);
	}

	getGreatGrandMothers() {
		implemented("getGreatGrandMothers");
		return this.getGreatGrandParents().filter(Filters.FEMALE);
	}

	getGreatGrandChildren() {
		implemented("getGreatGrandChildren");
		return this.getDescendants(3);
	}

	getGreatGrandSons() {
		implemented("getGreatGrandSons");
		return this.getGreatGrandChildren().filter(Filters.MALE);
	}

	getGreatGrandDaughters() {
		implemented("getGreatGrandDaughters");
		return this.getGreatGrandChildren().filter(Filters.FEMALE);
	}

	getAuncles() {
		implemented("getAuncles");

		return this.getParents().getSiblings();
	}

	getAunts() {
		implemented("getAunts");
		return this.getAuncles().filter(Filters.FEMALE);
	}

	getUncles() {
		implemented("getUncles");
		return this.getAuncles().filter(Filters.MALE);
	}

	getNiblings() {
		implemented("getNiblings");
		return this.getSiblings().getChildren();
	}

	getNieces() {
		implemented("getNieces");
		return this.getNiblings().filter(Filters.FEMALE);
	}

	getNephews() {
		implemented("getNephews");
		return this.getNiblings().filter(Filters.MALE);
	}

	getParentsInLaw() {
		implemented("getParentsInLaw");
		return this.getSpouses().getParents();
	}

	getFathersInLaw() {
		implemented("getFathersInLaw");
		return this.getParentsInLaw().filter(Filters.MALE);
	}

	getMothersInLaw() {
		implemented("getMothersInLaw");
		return this.getParentsInLaw().filter(Filters.FEMALE);
	}

	getSiblingsInLaw() {
		implemented("getSiblingsInLaw");
		return this.getSpouses()
			.copy()
			.getSiblings()
			.copy()
			.merge(this.getSiblings().getSpouses());
	}

	getBrothersInLaw() {
		implemented("getBrothersInLaw");
		return this.getSiblingsInLaw().filter(Filters.MALE);
	}

	getSistersInLaw() {
		implemented("getSistersInLaw");
		return this.getSiblingsInLaw().filter(Filters.FEMALE);
	}

	getChildrenInLaw() {
		implemented("getChildrenInLaw");
		return this.getChildren().getSpouses();
	}

	getSonsInLaw() {
		implemented("getSonsInLaw");
		return this.getChildrenInLaw().filter(Filters.MALE);
	}

	getDaughtersInLaw() {
		implemented("getDaughtersInLaw");
		return this.getChildrenInLaw().filter(Filters.FEMALE);
	}

	// These are generated automatically
	get2ndCousins() {
		return new Individuals();
	}

	get2ndGreatGrandParents() {
		return new Individuals();
	}

	get2ndGreatGrandChildren() {
		return new Individuals();
	}

	get3rdCousins() {
		return new Individuals();
	}

	get3rdGreatGrandParents() {
		return new Individuals();
	}

	get3rdGreatGrandChildren() {
		return new Individuals();
	}

	get4thCousins() {
		return new Individuals();
	}

	get4thGreatGrandParents() {
		return new Individuals();
	}

	get4thGreatGrandChildren() {
		return new Individuals();
	}

	get5thCousins() {
		return new Individuals();
	}

	get5thGreatGrandParents() {
		return new Individuals();
	}

	get5thGreatGrandChildren() {
		return new Individuals();
	}

	get6thCousins() {
		return new Individuals();
	}

	get6thGreatGrandParents() {
		return new Individuals();
	}

	get6thGreatGrandChildren() {
		return new Individuals();
	}

	get7thCousins() {
		return new Individuals();
	}

	get7thGreatGrandParents() {
		return new Individuals();
	}

	get7thGreatGrandChildren() {
		return new Individuals();
	}

	get8thCousins() {
		return new Individuals();
	}

	get8thGreatGrandParents() {
		return new Individuals();
	}

	get8thGreatGrandChildren() {
		return new Individuals();
	}

	get9thCousins() {
		return new Individuals();
	}

	get9thGreatGrandParents() {
		return new Individuals();
	}

	get9thGreatGrandChildren() {
		return new Individuals();
	}
}

const generateFunctions = () => {
	const levels: number[] = [2, 3, 4, 5, 6, 7, 8, 9];
	const types: Array<[GeneratorType, number, "level" | "degree"]> = [
		["Cousins", 0, "degree"],
		["GreatGrandParents", 2, "level"],
		["GreatGrandChildren", -2, "level"],
	];

	levels.forEach((level) => {
		types.forEach(([type, starting, direction]) => {
			let validLevel: GeneratorKey;

			if (level === 2) {
				validLevel = "2nd";
			} else if (level === 3) {
				validLevel = "3rd";
			} else {
				validLevel = `${level}th` as GeneratorKey;
			}
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			Indi.prototype[`get${validLevel}${type}`] = function (
				filter?: Filter
			) {
				if (direction === "level" && starting < 0) {
					return this.getRelativesOnLevel(-level + starting, filter);
				} else if (direction === "level" && starting > 0) {
					return this.getRelativesOnLevel(level + starting, filter);
				}

				return this.getRelativesOnDegree(level + starting);
			};
		});
	});
};

generateFunctions();

export type IndiType = Indi & IIndividualStructure & GeneratedIndiMethods;

export interface TreeMember<T = IndiType> {
	id: FamKey | IndiKey;
	father?: T;
	mother?: T;
	fatherSpouses?: T[];
	motherSpouses?: T[];
}

export type GenealogyMember<T = IndiType> = TreeMember<T> & {
	fatherSiblings?: T[];
	motherSiblings?: T[];
};

export interface IndiTree<T = IndiType> {
	existed: Record<IndiKey, boolean | undefined>;
	tree: Record<number, Array<TreeMember<T> | undefined>>;
}

export type IndiGenealogy<T = IndiType> = Pick<IndiTree<T>, "existed"> & {
	tree: Record<number, Array<GenealogyMember<T> | undefined>>;
};

export interface IndiMarker<T = IndiType> {
	isPrev?: boolean;
	isNext?: boolean;
	items: Array<T | undefined>;
}

export type MemberSide<T = IndiType, O extends object = object> = {
	left: Array<Array<T | undefined> | undefined>;
	right: Array<Array<T | undefined> | undefined>;
} & O;

export type MemberMain<T = IndiType> = MemberSide<T> & {
	main: MemberSide<T>;
};

export interface GenerationSpouseType {
	indi: IndiType;
	extra?: boolean;
	normal?: boolean;
}

export interface GenerationIndiType {
	indi: IndiType;
	leftSpouses?: GenerationSpouseType[];
	rightSpouses?: GenerationSpouseType[];
}

export type IndiGenealogyGenerations<T = IndiType> = Record<
	number,
	MemberMain<T>
>;

export type IndiGenealogyResult<T = IndiType> = Record<number, MemberSide<T>>;

export type NonNullIndiGenealogyResult<T = IndiType> = Record<
	number,
	Array<Array<T | undefined>>
>;

export interface PathItem {
	indi: IndiType;
	level: number;
	levelUp: number;
	levelDown: number;
	degree: number;
	kinship: Kinship; // Kinship type with previous path item
	relation?: RelationType; // Parent relative type with previous path item
	inLaw?: boolean;
	breakOnNext?: boolean;
	breakAfterNext?: boolean;
}

export type Path = PathItem[];
export type ReducedPath = Array<
	Omit<PathItem, "breakOnNext" | "breakAfterNext">
>;

export type QueueItem = {
	path: Path;
} & PathItem;
export type Queue = QueueItem[];

export const createIndi = (gedcom: GedComType, id: IndiKey): IndiType => {
	return new Indi(gedcom, id);
};
