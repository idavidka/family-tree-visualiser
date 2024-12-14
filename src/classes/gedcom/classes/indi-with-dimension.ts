import { type Position, type Size } from "../../../types/graphic-types";
import { type GeneratedIndiMethods } from "../interfaces/indi";
import type IIndividualStructure from "../../../types/structures/individual";
import { Indi } from "./indi";

export class IndiWithDimension extends Indi {
	position?: Position;
	size?: Size;
}

export type IndiWithDimensionType = IndiWithDimension &
	IIndividualStructure &
	GeneratedIndiMethods;
